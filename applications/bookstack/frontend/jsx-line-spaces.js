// Gives JSX the word breaks a reader sees between children.
//
// JSX drops a line break between two children, so
//   <div>{train.number}</div>
//   <div>{train.from} → {train.to}</div>
// shows two lines but has the text "G1001Shanghai → Beijing". The same happens without a line break when a block sits
// next to another element: <span>{train.number}</span><div>{train.from}</div> also reads "G1001Shanghai". Tests read
// text content, so a pattern such as /\bG1001\b/ or "Transfer waiting 1h 0m" no longer matches.
//
// This plugin puts a space in both places. Next to a block the space is never drawn (it falls at the start or end of a
// line, and flex and grid containers ignore it); between inline elements on separate lines it is the space HTML shows.
// Table structure and <select> may not hold text, and a component may pass its children into one, so those are left
// alone. Elements given an inline display class are treated as inline.
const NO_TEXT = new Set(["table", "thead", "tbody", "tfoot", "tr", "colgroup", "select", "optgroup", "datalist", "textarea",
  "style", "script", "html", "head", "svg"]);
const BLOCK = new Set(["address", "article", "aside", "blockquote", "details", "dialog", "dd", "div", "dl", "dt", "fieldset",
  "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol",
  "p", "pre", "section", "summary", "table", "ul"]);
const INLINE_CLASS = /(^|\s)(inline|inline-block|inline-flex|inline-grid|contents)(\s|$)/;

export default function jsxLineSpaces({ types: t }) {
  const shows = (node) => Boolean(node) && (t.isJSXElement(node) || t.isJSXFragment(node)
    || (t.isJSXExpressionContainer(node) && !t.isJSXEmptyExpression(node.expression)));
  const space = () => t.jsxExpressionContainer(t.stringLiteral(" "));
  const tag = (node) => t.isJSXElement(node) && t.isJSXIdentifier(node.openingElement.name)
    ? node.openingElement.name.name : null;
  const classText = (node) => {
    const attribute = node.openingElement.attributes.find((a) => t.isJSXAttribute(a) && a.name.name === "className");
    const value = attribute && attribute.value;
    if (t.isStringLiteral(value)) return value.value;
    const expression = t.isJSXExpressionContainer(value) ? value.expression : null;
    if (t.isStringLiteral(expression)) return expression.value;
    if (t.isTemplateLiteral(expression)) return expression.quasis.map((q) => q.value.cooked).join(" ");
    return "";
  };
  const block = (node) => BLOCK.has(tag(node)) && !INLINE_CLASS.test(classText(node));
  // React Router's Link and NavLink render their children inside <a>, so they hold text like <a> does
  // (<Link><span>Cart</span>\n<span>{count}</span></Link> otherwise reads "Cart1").
  const routerLink = (path, name) => {
    const binding = path.scope.getBinding(name);
    const declaration = binding && binding.path;
    return Boolean(declaration) && declaration.isImportSpecifier()
      && ["Link", "NavLink"].includes(declaration.node.imported.name)
      && /^react-router(-dom)?$/.test(declaration.parentPath.node.source.value);
  };

  return {
    name: "jsx-line-spaces",
    visitor: {
      JSXElement(path) {
        const name = tag(path.node);
        if (!name || NO_TEXT.has(name) || (!/^[a-z]/.test(name) && !routerLink(path, name))) return;
        const children = path.node.children;
        const result = [];
        children.forEach((child, index) => {
          const before = children[index - 1], after = children[index + 1];
          if (!t.isJSXText(child)) {
            // Elements or words side by side with nothing between: a block on either side is a word break.
            const touching = shows(before) || (t.isJSXText(before) && /\S$/.test(before.value));
            if (touching && (block(child) || (shows(before) && block(before)))) result.push(space());
            result.push(child);
            return;
          }
          if (block(before) && /^\S/.test(child.value)) result.push(space());
          if (!/\S/.test(child.value)) {
            // Only a line break between two shown children: it becomes one space.
            result.push(child.value.includes("\n") && shows(before) && shows(after) ? space() : child);
            return;
          }
          // Text that starts or ends on its own line next to an element: keep the space JSX would trim.
          if (/^\s*\n/.test(child.value) && shows(before)) result.push(space());
          result.push(child);
          if (/\n\s*$/.test(child.value) && shows(after)) result.push(space());
        });
        path.node.children = result;
      },
    },
  };
}
