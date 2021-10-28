//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;
pragma abicoder v2;

contract ImageHost {
    string public host;

    struct Query {
        string key;
        string value;
    }

    event SetHost(string host);

    constructor(string memory host_) {
        host = host_;
    }

    function getFullUri(string[] memory paths, Query[] memory queries)
        public
        view
        returns (string memory)
    {
        string memory path;
        for (uint256 i = 0; i < paths.length; i += 1) {
            path = string(abi.encodePacked(path, "/", paths[i]));
        }

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

        return string(abi.encodePacked(host, path, "?", queryString));
    }

    function _setHost(string memory host_) internal virtual {
        host = host_;
        emit SetHost(host_);
    }
}
