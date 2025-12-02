import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

export const MathPreview = ({ text }: { text: string }) => {
    if (!text) return <span></span>;

    try {
        const parts: React.ReactElement[] = [];
        let currentIndex = 0;
        let inMath = false;
        let mathStart = -1;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '$') {
                if (inMath) {
                    // End of math expression
                    const mathText = text.substring(mathStart + 1, i);
                    try {
                        const html = katex.renderToString(mathText, {
                            throwOnError: false,
                            displayMode: false,
                        });
                        parts.push(<span key={i} dangerouslySetInnerHTML={{ __html: html }} />);
                    } catch {
                        parts.push(<span key={i}>${mathText}$</span>);
                    }
                    currentIndex = i + 1;
                    inMath = false;
                } else {
                    // Start of math expression
                    if (i > currentIndex) {
                        // Add normal text before math - Render as Markdown
                        const mdText = text.substring(currentIndex, i);
                        parts.push(
                            <span key={currentIndex} className="inline-block">
                                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{mdText}</ReactMarkdown>
                            </span>
                        );
                    }
                    mathStart = i;
                    inMath = true;
                }
            }
        }

        // Add remaining text
        if (currentIndex < text.length) {
            const mdText = text.substring(currentIndex);
            parts.push(
                <span key={currentIndex} className="inline-block">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>{mdText}</ReactMarkdown>
                </span>
            );
        }

        return <div className="prose dark:prose-invert max-w-none flex flex-wrap gap-1 items-center">{parts}</div>;
    } catch (e) {
        return <span>{text}</span>;
    }
};
