import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useEffect, useState, useMemo } from "react";
import mermaid from "mermaid";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onContentLoad?: () => void;
}

mermaid.initialize({
  startOnLoad: true,
  theme: "dark",
  themeVariables: {
    primaryColor: "#1e293b",
    primaryTextColor: "#e2e8f0",
    primaryBorderColor: "#475569",
    lineColor: "#475569",
    secondaryColor: "#334155",
    tertiaryColor: "#1e293b",
    background: "#0f172a",
  },
});

const LinkPreview = ({
  href,
  children,
  ...props
}: {
  href?: string;
  children: React.ReactNode;
  [key: string]: unknown;
}) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <span className="relative inline-block">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 underline-offset-2 transition-colors"
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
        {...props}
      >
        {children}
      </a>
      {showPreview && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg z-10 whitespace-nowrap border border-border">
          {href}
        </div>
      )}
    </span>
  );
};

const MermaidDiagram = ({
  code,
  onLoad,
}: {
  code: string;
  onLoad?: () => void;
}) => {
  const [svg, setSvg] = useState<string>("");
  const mermaidId = useMemo(
    () => `mermaid-${Date.now()}-${Math.random()}`,
    []
  );

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render(mermaidId, code);
        if (isMounted) {
          setSvg(svg);
          // Trigger scroll update after diagram is rendered
          setTimeout(() => {
            onLoad?.();
          }, 50);
        }
      } catch (error) {
        console.error("Failed to render mermaid diagram:", error);
      }
    };
    renderDiagram();

    return () => {
      isMounted = false;
      // Cleanup any mermaid DOM nodes
      const element = document.getElementById(mermaidId);
      if (element) {
        element.remove();
      }
    };
  }, [code, mermaidId, onLoad]);

  if (!svg)
    return (
      <div className="text-muted-foreground">Loading diagram...</div>
    );

  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
      className="mermaid-container"
    />
  );
};

export const MarkdownRenderer = ({
  content,
  className = "",
  onContentLoad,
}: MarkdownRendererProps) => {
  const processedContent = content || "";

  const isIncompleteCodeBlock = (text: string) => {
    const codeBlockStarts = (text.match(/```/g) || []).length;
    return codeBlockStarts % 2 !== 0;
  };

  const finalContent = isIncompleteCodeBlock(processedContent)
    ? processedContent + "\n```"
    : processedContent;

  const components: Components = {
    code({ className, children }) {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";
      const codeString = String(children).replace(/\n$/, "");
      const isCodeBlock = className?.includes("language-");

      if (language === "mermaid" && isCodeBlock) {
        return (
          <MermaidDiagram code={codeString} onLoad={onContentLoad} />
        );
      }

      if (isCodeBlock && language) {
        return (
          <div className="relative group my-3">
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                padding: "1rem",
                backgroundColor: "#1e1e1e",
              }}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }

      if (isCodeBlock) {
        return (
          <div className="relative group my-3">
            <pre className="bg-card rounded-lg p-4 overflow-x-auto border border-border">
              <code className="text-sm text-card-foreground">
                {children}
              </code>
            </pre>
          </div>
        );
      }

      return (
        <code className="bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono">
          {children}
        </code>
      );
    },
    pre({ children }) {
      return <>{children}</>;
    },
    a({ href, children, ...props }) {
      return (
        <LinkPreview href={href} {...props}>
          {children}
        </LinkPreview>
      );
    },
    table({ children, ...props }) {
      return (
        <div className="overflow-x-auto my-4">
          <table
            className="min-w-full divide-y divide-border rounded-lg overflow-hidden"
            {...props}
          >
            {children}
          </table>
        </div>
      );
    },
    thead({ children, ...props }) {
      return (
        <thead className="bg-muted/50" {...props}>
          {children}
        </thead>
      );
    },
    tbody({ children, ...props }) {
      return (
        <tbody className="bg-card/30 divide-y divide-border" {...props}>
          {children}
        </tbody>
      );
    },
    th({ children, ...props }) {
      return (
        <th
          className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
          {...props}
        >
          {children}
        </th>
      );
    },
    td({ children, ...props }) {
      return (
        <td className="px-4 py-3 text-sm text-foreground" {...props}>
          {children}
        </td>
      );
    },
    ul({ children, ...props }) {
      return (
        <ul
          className="list-disc list-inside space-y-1.5 my-3 ml-4"
          {...props}
        >
          {children}
        </ul>
      );
    },
    ol({ children, ...props }) {
      return (
        <ol
          className="list-decimal list-inside space-y-1.5 my-3 ml-4"
          {...props}
        >
          {children}
        </ol>
      );
    },
    li({ children, ...props }) {
      const checkbox =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (children as any)?.[0]?.props?.checked !== undefined;
      if (checkbox) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checked = (children as any)[0].props.checked;
        return (
          <li
            className="flex items-start space-x-2 list-none"
            {...props}
          >
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="mt-1 rounded border-border bg-muted"
            />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <span>{(children as any).slice(1)}</span>
          </li>
        );
      }
      return <li {...props}>{children}</li>;
    },
    blockquote({ children, ...props }) {
      return (
        <blockquote
          className="border-l-4 border-muted-foreground/50 pl-4 my-3 italic text-muted-foreground"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    h1({ children, ...props }) {
      return (
        <h1 className="text-2xl font-bold mt-6 mb-3" {...props}>
          {children}
        </h1>
      );
    },
    h2({ children, ...props }) {
      return (
        <h2 className="text-xl font-semibold mt-5 mb-2" {...props}>
          {children}
        </h2>
      );
    },
    h3({ children, ...props }) {
      return (
        <h3 className="text-lg font-semibold mt-4 mb-2" {...props}>
          {children}
        </h3>
      );
    },
    p({ children, ...props }) {
      return (
        <p className="my-2 leading-relaxed" {...props}>
          {children}
        </p>
      );
    },
    hr({ ...props }) {
      return <hr className="my-6 border-border" {...props} />;
    },
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {finalContent}
      </ReactMarkdown>
    </div>
  );
};
