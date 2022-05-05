export const codeBlock = (text: string, markdown: string = "") =>
  "```" + markdown + "\n" + text + "```";

export const hyperlink = (text: string, url: string) => `[${text}](${url})`;

export const bold = (text: string) => "**" + text + "**";
