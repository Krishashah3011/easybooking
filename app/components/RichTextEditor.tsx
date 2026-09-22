import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { BORDER, TEXT_MUTED } from "./SettingsUI";

export type RichTextEditorHandle = {
  insertText: (text: string) => void;
};

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
};

// A deliberately small toolbar: bold, italic, bullet list, link.
// Merchants never see or type raw HTML tags.
const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ value, onChange }, ref) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
        }),
        Link.configure({
          openOnClick: false,
          autolink: false,
        }),
      ],
      content: value,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
    });

    // Keep editor content in sync when switching templates or after
    // a reset/save round-trip replaces the value from outside.
    useEffect(() => {
      if (!editor) return;
      if (value !== editor.getHTML()) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor]);

    useImperativeHandle(
      ref,
      () => ({
        insertText: (text: string) => {
          editor?.chain().focus().insertContent(text).run();
        },
      }),
      [editor],
    );

    if (!editor) return null;

    const setLink = () => {
      const previousUrl = editor.getAttributes("link").href as string | undefined;
      const url = window.prompt("Link URL", previousUrl ?? "https://");
      if (url === null) return;
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    };

    return (
      <div style={wrapStyle} className="rte-wrap">
        <style>{PROSEMIRROR_CSS}</style>
        <div style={toolbarStyle}>
          <ToolbarButton
            active={editor.isActive("bold")}
            label="Bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            label="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("bulletList")}
            label="Bullet list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            &#8226; List
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("link")}
            label="Link"
            onClick={setLink}
          >
            Link
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} style={editorAreaStyle} />
      </div>
    );
  },
);

export default RichTextEditor;

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: "4px",
        border: `1px solid ${active ? "#073E74" : BORDER}`,
        background: active ? "#E8EEF5" : "#fff",
        color: active ? "#073E74" : TEXT_MUTED,
        fontFamily: "Inter",
        fontSize: "13px",
        cursor: "pointer",
        lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  );
}

const wrapStyle: React.CSSProperties = {
  border: `1px solid ${BORDER}`,
  borderRadius: "4px",
  overflow: "hidden",
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  padding: "6px 8px",
  borderBottom: `1px solid ${BORDER}`,
  background: "#F5F6F7",
};

const editorAreaStyle: React.CSSProperties = {
  padding: "10px",
  minHeight: "140px",
  fontFamily: "Inter",
  fontSize: "14px",
  lineHeight: 1.5,
};

const PROSEMIRROR_CSS = `
  .rte-wrap .ProseMirror {
    min-height: 140px;
    outline: none;
  }
  .rte-wrap .ProseMirror p {
    margin: 0 0 8px;
  }
  .rte-wrap .ProseMirror ul {
    margin: 0 0 8px;
    padding-left: 20px;
  }
  .rte-wrap .ProseMirror a {
    color: #073E74;
    text-decoration: underline;
  }
`;
