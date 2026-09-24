import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { BORDER_ML, TEXT_MUTED_ML } from "./SettingsUI";

export type RichTextEditorHandle = {
  insertText: (text: string) => void;
};

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  footer?: React.ReactNode;
};

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ value: valueML, onChange: onChangeML, footer: footerML }, refML) {
    const editorML = useEditor({
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
      content: valueML,
      onUpdate: ({ editor: editorML }) => {
        onChangeML(editorML.getHTML());
      },
    });

    useEffect(() => {
      if (!editorML) return;
      if (valueML !== editorML.getHTML()) {
        editorML.commands.setContent(valueML, { emitUpdate: false });
      }
    }, [valueML, editorML]);

    useImperativeHandle(
      refML,
      () => ({
        insertText: (textML: string) => {
          editorML?.chain().focus().insertContent(textML).run();
        },
      }),
      [editorML],
    );

    if (!editorML) return null;

    const setLinkML = () => {
      const previousUrlML = editorML.getAttributes("link").href as string | undefined;
      const urlML = window.prompt("Link URL", previousUrlML ?? "https://");
      if (urlML === null) return;
      if (urlML === "") {
        editorML.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editorML.chain().focus().extendMarkRange("link").setLink({ href: urlML }).run();
    };

    return (
      <div style={wrapStyleML} className="rte-wrap">
        <style>{PROSEMIRROR_CSS_ML}</style>
        <div style={toolbarStyleML}>
          <ToolbarButton
            active={editorML.isActive("bold")}
            label="Bold"
            onClick={() => editorML.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            active={editorML.isActive("italic")}
            label="Italic"
            onClick={() => editorML.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            active={editorML.isActive("bulletList")}
            label="Bullet list"
            onClick={() => editorML.chain().focus().toggleBulletList().run()}
          >
            &#8226; List
          </ToolbarButton>
          <ToolbarButton
            active={editorML.isActive("link")}
            label="Link"
            onClick={setLinkML}
          >
            Link
          </ToolbarButton>
        </div>
        <EditorContent editor={editorML} style={editorAreaStyleML} />
        {footerML && <div style={footerStyleML}>{footerML}</div>}
      </div>
    );
  },
);

export default RichTextEditor;

function ToolbarButton({
  active: activeML,
  label: labelML,
  onClick: onClickML,
  children: childrenML,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={labelML}
      aria-label={labelML}
      aria-pressed={activeML}
      onClick={onClickML}
      style={{
        padding: "4px 10px",
        borderRadius: "4px",
        border: `1px solid ${activeML ? "#073E74" : BORDER_ML}`,
        background: activeML ? "#E8EEF5" : "#fff",
        color: activeML ? "#073E74" : TEXT_MUTED_ML,
        fontFamily: "Inter",
        fontSize: "13px",
        cursor: "pointer",
        lineHeight: 1.4,
      }}
    >
      {childrenML}
    </button>
  );
}

const wrapStyleML: React.CSSProperties = {
  border: `1px solid ${BORDER_ML}`,
  borderRadius: "4px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  flex: 1,
  height: "100%",
};

const toolbarStyleML: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  padding: "6px 8px",
  borderBottom: `1px solid ${BORDER_ML}`,
  background: "#F5F6F7",
};

const editorAreaStyleML: React.CSSProperties = {
  padding: "10px",
  minHeight: "220px",
  flex: 1,
  fontFamily: "Inter",
  fontSize: "14px",
  lineHeight: 1.5,
};

const footerStyleML: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  padding: "8px 10px",
  borderTop: `1px solid ${BORDER_ML}`,
  background: "#F5F6F7",
};

const PROSEMIRROR_CSS_ML = `
  .rte-wrap .ProseMirror {
    min-height: 220px;
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