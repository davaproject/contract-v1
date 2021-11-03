interface Query {
  key: string;
  value: string;
}

export const getFullUri = ({
  host,
  params,
  queries,
}: {
  host: string;
  params: Array<string>;
  queries: Array<Query>;
}): string => {
  const paramStr = params.length > 0 ? "/" + params.join("/") : "";
  const queryStr =
    queries.length > 0
      ? "?" + queries.map(({ key, value }) => key + "=" + value).join("&")
      : "";

  return `${host}${paramStr}${queryStr}`;
};
