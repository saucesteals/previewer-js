export const shortenText = (
  text: string,
  maxLength: number,
  trail: string = "..."
): string => {
  return text.length <= maxLength - trail.length
    ? text
    : text.substring(0, maxLength - trail.length) + trail;
};

export const toTitleCase = (text: string): string => {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
    .join(" ");
};

export const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
