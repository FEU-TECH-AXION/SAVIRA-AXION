import { StyleSheet, Text, View } from 'react-native';

function parsePolicyMarkdown(markdown) {
  const blocks = [];
  const lines = markdown.trim().split(/\r?\n/);
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: 'list', items: list });
    list = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (/^-{3,}$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'rule' });
      return;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: heading[2],
      });
      return;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      list.push(trimmed.slice(2));
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return blocks;
}

function renderInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={`${keyPrefix}-${index}`} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }

    return part;
  });
}

export default function PolicyMarkdown({ markdown }) {
  const blocks = parsePolicyMarkdown(markdown);

  return (
    <View style={styles.wrap}>
      {blocks.map((block, index) => {
        if (block.type === 'rule') {
          return <View key={index} style={styles.rule} />;
        }

        if (block.type === 'heading') {
          return (
            <Text key={index} style={styles.heading}>
              {block.text}
            </Text>
          );
        }

        if (block.type === 'list') {
          return (
            <View key={index} style={styles.list}>
              {block.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.listItem}>
                  <Text style={styles.bullet}>{'\u2022'}</Text>
                  <Text style={styles.paragraph}>
                    {renderInline(item, `${index}-${itemIndex}`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text key={index} style={styles.paragraph}>
            {renderInline(block.text, index)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  heading: {
    marginTop: 8,
    color: '#037F81',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
  },
  paragraph: {
    color: '#526060',
    fontSize: 13,
    lineHeight: 20,
  },
  bold: {
    color: '#263333',
    fontWeight: '800',
  },
  list: {
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    color: '#037F81',
    fontSize: 13,
    lineHeight: 20,
  },
  rule: {
    height: 1,
    marginVertical: 6,
    backgroundColor: '#e7edec',
  },
});
