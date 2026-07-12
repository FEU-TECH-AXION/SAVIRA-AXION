function parsePolicyMarkdown(markdown) {
  const blocks = [];
  const lines = markdown.trim().split(/\r?\n/);
  let list = [];

  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: "list", items: list });
    list = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (/^-{3,}$/.test(trimmed)) {
      flushList();
      blocks.push({ type: "rule" });
      return;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2],
      });
      return;
    }

    if (trimmed.startsWith("- ")) {
      list.push(trimmed.slice(2));
      return;
    }

    // Each non-empty, non-special line becomes its own paragraph block.
    // This preserves line breaks that appear in the source markdown
    // (e.g. a bold title followed immediately by body text on the next line)
    // instead of collapsing them into a single run-on paragraph.
    flushList();
    blocks.push({ type: "paragraph", text: trimmed });
  });

  flushList();

  return blocks;
}

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

export default function PolicyMarkdown({ markdown, className }) {
  const blocks = parsePolicyMarkdown(markdown);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === "rule") return <hr key={index} />;

        if (block.type === "heading") {
          const HeadingTag = `h${Math.min(block.level, 6)}`;
          return <HeadingTag key={index}>{block.text}</HeadingTag>;
        }

        if (block.type === "list") {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        return <p key={index}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}