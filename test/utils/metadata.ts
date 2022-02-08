export interface Attribute {
  trait_type: string;
  value: string;
}

export interface Metadata {
  name: string;
  external_url: string;
  description: string;
  attributes: Array<Attribute>;
  raw_image: string;
  image: string;
}

const utfAppendStr = "data:application/json;utf8,";

export const rawStringToJson = (metadataStr: string): Metadata => {
  return JSON.parse(metadataStr.split(utfAppendStr)[1]);
};

interface BaseMetadata {
  name: string;
  host: string;
  description: string;
  attributes: Array<Attribute>;
  rawImage: string;
  imageUri: string;
}

export interface PartMetadata extends BaseMetadata {
  collection: string;
  tokenId: string;
  maxSupply: string;
  type: string;
}

export const generatePartMetadataString = (partData: PartMetadata) => {
  const metadata = {
    name: partData.name,
    external_url: `${partData.host}/info/${partData.collection.toLowerCase()}/${
      partData.tokenId
    }`,
    description: partData.description,
    attributes: [
      ...partData.attributes,
      { trait_type: "TYPE", value: partData.type },
    ],
    raw_image: partData.rawImage,
    image: partData.imageUri,
  };

  return utfAppendStr + JSON.stringify(metadata);
};

export interface AvatarMetadata extends BaseMetadata {
  dava: string;
  avatar: string;
  tokenId: string;
}

export const generateAvatarMetadataString = (avatarData: AvatarMetadata) => {
  const metadata = {
    name: avatarData.name,
    external_url: `${avatarData.host}/info/${avatarData.dava.toLowerCase()}/${
      avatarData.tokenId
    }`,
    description: avatarData.description,
    attributes: [
      ...avatarData.attributes,
      { trait_type: "ADDRESS", value: avatarData.avatar.toLowerCase() },
    ],
    raw_image: avatarData.rawImage,
    image: avatarData.imageUri,
  };

  return utfAppendStr + JSON.stringify(metadata);
};
