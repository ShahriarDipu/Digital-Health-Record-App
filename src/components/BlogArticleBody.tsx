"use client";

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-gray-800">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function BlogArticleBody({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="text-lg font-bold text-gray-900 pt-2">
              {trimmed.replace(/^##\s*/, "")}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h3 key={i} className="text-base font-bold text-gray-900 pt-1">
              {trimmed.replace(/^#\s*/, "")}
            </h3>
          );
        }
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}
