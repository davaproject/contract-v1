export const createImage = (imgURIs: string[]): string => {
  return (
    "<svg xmlns='http://www.w3.org/2000/svg' width='1000' height='1000' viewBox='0 0 1000 1000'>" +
    imgURIs.map(wrapImageWihtSvg).join("") +
    "</svg>"
  );
};

export const wrapImageWihtSvg = (imgUri: string): string =>
  `<image href='${imgUri}' width='100%'/>`;

interface Layer {
  address: string;
  tokenId: number;
}

export const createImageUri = ({
  host,
  layers,
}: {
  host: string;
  layers: Array<Layer>;
}): string => {
  return `${host}/images?${layers
    .map(({ address, tokenId }) => `${address}=${tokenId}`)
    .join("&")}`;
};
