/**
 * @copyright 2020, the Converse.js contributors
 * @license Mozilla Public License (MPLv2)
 * @description Pure functions to help funcitonally parse messages.
 * @todo Other parsing helpers can be made more abstract and placed here.
 */
const helpers = {};

// Captures all mentions, but includes a space before the @
helpers.mention_regex = /(?:\s|^)([@][\w_-]+(?:\.\w+)*)/ig;

helpers.matchRegexInText = text => regex => text.matchAll(regex);

const escapeRegexChars = (string, char) => string.replace(RegExp('\\' + char, 'ig'), '\\' + char);

helpers.escapeCharacters = characters => string =>
    characters.split('').reduce(escapeRegexChars, string);

helpers.escapeRegexString = helpers.escapeCharacters('[\\^$.?*+(){}');

// `for` is ~25% faster than using `Array.find()`
helpers.findFirstMatchInArray = array => text => {
    for (let i = 0; i < array.length; i++) {
        if (text.localeCompare(array[i], undefined, {sensitivity: 'base'}) === 0) {
            return array[i];
        }
    }
    return null;
};

const reduceReferences = ([text, refs], ref, index) => {
    let updated_text = text;
    let { begin, end } = ref;
    const { value } = ref;
    begin = begin - index;
    end = end - index - 1; // -1 to compensate for the removed @
    updated_text = `${updated_text.slice(0, begin)}${value}${updated_text.slice(end + 1)}`;
    return [updated_text, [...refs, { ...ref, begin, end }]]
}

helpers.reduceTextFromReferences = (text, refs) => refs.reduce(reduceReferences, [text, []]);

export default helpers;

const styling_directives = ['*', '_', '~', '`', '```', '>'];
const recursive_directives = ['*', '_', '~', '>'];
const styling_map = {
    '*': {'name': 'strong', 'type': 'span'},
    '_': {'name': 'emphasis', 'type': 'span'},
    '~': {'name': 'strike', 'type': 'span'},
    '`': {'name': 'preformatted', 'type': 'span'},
    '```': {'name': 'preformatted_block', 'type': 'block'},
    '>': {'name': 'quote', 'type': 'block'}
};

const styling_templates = {
    emphasis: (text) => `<i>${text}</i>`,
    preformatted: (text) => `<code>${text}</code>`,
    preformatted_block: (text) => `<code class="block">${text}</code>`,
    quote: (text) => `<blockquote>${text}</blockquote>`,
    strike: (text) => `<del>${text}</del>`,
    strong: (text) => `<b>${text}</b>`,
};

const isQuoteDirective = (d) => ['>', '&gt;'].includes(d);

function escape (text) {
    return text
        .replace(/\&/g, "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/(\p{L}|\p{N}|\p{P})>/g,  "$1&gt;")
        .replace(/'/g,  "&apos;")
        .replace(/"/g,  "&quot;");
}


function getDirective (text, i, opening=true) {
    // TODO: blockquote is only valid if on own line
    // TODO: blockquote without end quote is valid until end of text or of containing quote
    let d;
    if (styling_directives.includes(text.slice(i, i+4))) {
        d = text.slice(i, i+4);
    } else if (
        text.slice(i).match(/(^```\s*\n|^```\s*$)/) &&
        (i === 0 || text[i-1] === '\n' || text[i-1] === '>')
    ) {
        d = text.slice(i, i+3);
    } else if (styling_directives.includes(text.slice(i, i+1)) && text[i] !== text[i+1]) {
        d = text.slice(i, i+1);
    } else {
        return null;
    }
    if (opening && styling_map[d].type === 'span' && !text.slice(i+1).split('\n').shift().includes(d)) {
        // span directive without closing part before end or line-break, so not valid
        return null;
    } else {
        return d;
    }
}


function isDirectiveEnd (d, i, text) {
    const dtype = styling_map[d].type; // directive type
    return i === text.length || getDirective(text, i, false) === d || (dtype === 'span' && text[i] === '\n');
}


function getDirectiveLength (d, text, i) {
    if (!d) { return 0; }
    const begin = i;
    i += d.length;
    if (isQuoteDirective(d)) {
        i += text.slice(i).split(/\n[^>]/).shift().length;
        return i-begin;
    } else {
        // Set i to the last char just before the end of the direcive
        while (!isDirectiveEnd(d, i, text)) { i++; }
        if (i <= text.length) {
            i += d.length;
            return i-begin;
        }
    }
    return 0;
}


function getDirectiveAndLength (text, i) {
    const d = getDirective(text, i);
    const length = d ? getDirectiveLength(d, text, i) : 0;
    return  { d, length };
}


function getDirectiveMarkup (text) {
    let i = 0, html = '';
    while (i < text.length) {
        const { d, length } = getDirectiveAndLength(text, i);
        if (d && length) {
            const begin = i;
            const template = styling_templates[styling_map[d].name];
            i += d.length;

            if (isQuoteDirective(d)) {
                // The quote directive doesn't have a closing tag
                i += length;
                const newtext = text.slice(begin+1, i).replace(/\n>/g, '\n');
                html += `${template(getDirectiveMarkup(newtext))}`
            } else {
                // i is just after the opening directive, we now set it to just before the closing direcive
                i += (length - (2*d.length));
                if (recursive_directives.includes(d)) {
                    html += `${d}${template(getDirectiveMarkup(text.slice(begin+1, i)))}${d}`
                } else {
                    html += `${d}${template(text.slice(begin+d.length, i))}${d}`
                }
                i += d.length;
            }
        } else {
            html += text[i];
            i++;
        }
    }
    return html;
}


function containsDirectives (text) {
    for (let i=0; i<styling_directives.length; i++) {
        if (text.includes(styling_directives[i])) {
            return true;
        }
    }
}


export function getMessageStylingReferences (text) {
    let i = 0;
    const references = [];
    if (containsDirectives(text)) {
        while (i < text.length) {
            const { d, length } = getDirectiveAndLength(text, i);
            if (d) {
                const end = i+length;
                references.push({'begin': i, end, 'html': getDirectiveMarkup(escape(text.slice(i, end))) });
                i = end;
            }
            i++;
        }
    }
    return references;
}
