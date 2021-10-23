export const svgStartLine =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">';
export const svgEndLine = '</svg>';
export const imgStartLine = '<image href="';
export const imgEndLine = '" width="100%"/>';

export const wrapLinkWithImg = (link: string) =>
  imgStartLine + link + imgEndLine;

export const wrapLinksWithSVG = (links: string[]) => {
  let svg = svgStartLine;
  for (let i = 0; i < links.length; i += 1) {
    svg += wrapLinkWithImg(links[i]);
  }
  svg += svgEndLine;

  return svg;
};

export const wrapSVGsWithSVG = (svgs: string[]) => {
  let svg = svgStartLine;
  for (let i = 0; i < svgs.length; i += 1) {
    svg += svgs[i];
  }
  svg += svgEndLine;

  return svg;
};
