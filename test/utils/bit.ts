export const bin2hex = (b: string) => {
  return b.match(/.{4}/g)!.reduce((acc, i) => {
    return acc + parseInt(i, 2).toString(16);
  }, "");
};

export const partIdsToHex = (ids: Array<number>): string => {
  if (ids.length !== 28) {
    throw new Error("invalid id length");
  }

  var beforeHex = "";
  for (let i = 0; i < 28; i += 1) {
    var binary = ids[i].toString(2);
    var fullBinary = binary.padStart(9, "0");
    beforeHex += fullBinary;
  }
  beforeHex = beforeHex.padEnd(256, "0");
  return "0x" + bin2hex(beforeHex);
};
