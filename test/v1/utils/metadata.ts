export interface Metadata {
  name: string;
  creator: string;
  description: string;
  attributes: Array<{ trait_type: string; value: string }>;
  raw_image: string;
  image: string;
}

export const rawStringToJson = (metadataStr: string): Metadata => {
  return JSON.parse(metadataStr.split("data:application/json;utf8,")[1]);
};
