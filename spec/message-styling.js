/*global mock, converse */

const u = converse.env.u;

describe("A incoming chat Message", function () {

    it("can be styled with XEP-0393 message styling hints",
        mock.initConverse(['rosterGroupsFetched', 'chatBoxesFetched'], {},
            function (done) {

        done();
    }));

    it("can have styling disabled",
        mock.initConverse(['rosterGroupsFetched', 'chatBoxesFetched'], {},
            function (done) {

        done();
    }));
});


describe("A outgoing chat Message", function () {

    it("can be styled with XEP-0393 message styling hints",
        mock.initConverse(['rosterGroupsFetched', 'chatBoxesFetched'], {},
            async function (done, _converse) {

        let msg_text, msg, msg_el;
        await mock.waitForRoster(_converse, 'current', 1);
        const contact_jid = mock.cur_names[0].replace(/ /g,'.').toLowerCase() + '@montague.lit';
        await mock.openChatBoxFor(_converse, contact_jid);
        const view = _converse.api.chatviews.get(contact_jid);

        msg_text = "This *message _contains_* styling hints! \`Here's *some* code\`";
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
        await _converse.handleMessageStanza(msg);
        await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = view.el.querySelector('converse-chat-message-body');
        expect(msg_el.innerText).toBe(msg_text);
        await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') ===
            'This *<b>message _<i>contains</i>_</b>* styling hints! `<code>Here\'s *some* code</code>`');

        msg_text = "This *is not a styling hint \n * _But this is_!";
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
        await _converse.handleMessageStanza(msg);
        await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = Array.from(view.el.querySelectorAll('converse-chat-message-body')).pop();
        expect(msg_el.innerText).toBe(msg_text);
        await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') ===
            "This *is not a styling hint \n * _<i>But this is</i>_!");

        msg_text = "Here's a ~strikethrough section~";
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
                await _converse.handleMessageStanza(msg);
                await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = Array.from(view.el.querySelectorAll('converse-chat-message-body')).pop();
        expect(msg_el.innerText).toBe(msg_text);
        await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') ===
            "Here's a ~<del>strikethrough section</del>~");

        msg_text = `Here's a code block: \n\`\`\`\nInside the code-block, <code>hello</code> we don't enable *styling hints* like ~these~\n\`\`\``;
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
        await _converse.handleMessageStanza(msg);
        await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = Array.from(view.el.querySelectorAll('converse-chat-message-body')).pop();
        expect(msg_el.innerText).toBe(msg_text);
        await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') ===
            'Here\'s a code block: \n```<code class="block">\nInside the code-block, &lt;code&gt;hello&lt;/code&gt; we don\'t enable *styling hints* like ~these~\n</code>```'
        );

        msg_text = `> This is quoted text\n>This is also quoted\nThis is not quoted`;
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
        await _converse.handleMessageStanza(msg);
        await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = Array.from(view.el.querySelectorAll('converse-chat-message-body')).pop();
        expect(msg_el.innerText).toBe(msg_text);
        await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') === '<blockquote> This is quoted text\nThis is also quoted</blockquote>\nThis is not quoted');

        msg_text = `> This is *quoted* text\n>This is \`also _quoted_\`\nThis is not quoted`;
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
        await _converse.handleMessageStanza(msg);
        await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = Array.from(view.el.querySelectorAll('converse-chat-message-body')).pop();
        expect(msg_el.innerText).toBe(msg_text);
        await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') ===
                "<blockquote> This is *<b>quoted</b>* text\nThis is `<code>also _quoted_</code>`</blockquote>\nThis is not quoted");

        msg_text = `(There are three blocks in this body marked by parens,)\n (but there is no *formatting)\n (as spans* may not escape blocks.)`;
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
        await _converse.handleMessageStanza(msg);
        await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = Array.from(view.el.querySelectorAll('converse-chat-message-body')).pop();
        expect(msg_el.innerText).toBe(msg_text);
        await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') === msg_text);

        msg_text = "```ignored\n (println \"Hello, world!\")\n ```\n\n This should not show up as monospace, *preformatted* text ^";
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
        await _converse.handleMessageStanza(msg);
        await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = Array.from(view.el.querySelectorAll('converse-chat-message-body')).pop();
        expect(msg_el.innerText).toBe(msg_text);
        await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') ===
            "```ignored\n (println \"Hello, world!\")\n ```\n\n This should not show up as monospace, *<b>preformatted</b>* text ^");

        msg_text = "```\nignored\n (println \"Hello, world!\")\n```\n\n This should show up as monospace, preformatted text ^";
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
        await _converse.handleMessageStanza(msg);
        await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = Array.from(view.el.querySelectorAll('converse-chat-message-body')).pop();
        expect(msg_el.innerText).toBe(msg_text);
        await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') ===
            "```<code class=\"block\">\nignored\n (println \"Hello, world!\")\n</code>```\n\n This should show up as monospace, preformatted text ^");

        msg_text = `> > This is doubly quoted text`;
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
        await _converse.handleMessageStanza(msg);
        await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = Array.from(view.el.querySelectorAll('converse-chat-message-body')).pop();
        expect(msg_el.innerText).toBe(msg_text);
                await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') === "<blockquote> <blockquote> This is doubly quoted text</blockquote></blockquote>");

        msg_text = ">```\n>ignored\n> <span></span> (println \"Hello, world!\")\n>```\n>\n> This should show up as monospace, preformatted text ^";
        msg = mock.createChatMessage(_converse, contact_jid, msg_text)
        await _converse.handleMessageStanza(msg);
        await new Promise(resolve => view.model.messages.once('rendered', resolve));
        msg_el = Array.from(view.el.querySelectorAll('converse-chat-message-body')).pop();
        expect(msg_el.innerText).toBe(msg_text);
        await u.waitUntil(() => msg_el.innerHTML.replace(/<!---->/g, '') ===
            "<blockquote>```<code class=\"block\">\nignored\n &lt;span&gt;&lt;/span&gt; (println \"Hello, world!\")\n</code>```\n\n This should show up as monospace, preformatted text ^</blockquote>");

        done();
    }));
});
