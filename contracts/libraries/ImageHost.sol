//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

library ImageHost {
    struct Query {
        string key;
        string value;
    }

    function getFullUri(string memory host, Query[] memory queries)
        internal
        pure
        returns (string memory)
    {
        string memory queryString;
        for (uint256 i = 0; i < queries.length; i += 1) {
            if (i != 0) {
                queryString = string(abi.encodePacked(queryString, "&"));
            }
            queryString = string(
                abi.encodePacked(
                    queryString,
                    queries[i].key,
                    "=",
                    queries[i].value
                )
            );
        }

        return string(abi.encodePacked(host, "?", queryString));
    }
}
