//SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

contract EIP712Base {
    // EIP712 Implementation from OS
    struct EIP712Domain {
        string name;
        string version;
        address verifyingContract;
        bytes32 salt;
    }

    bytes32 private immutable _CACHED_DOMAIN_SEPARATOR;
    bytes32 private immutable _HASHED_NAME;
    bytes32 private immutable _HASHED_VERSION;
    bytes32 private immutable _TYPE_HASH;

    constructor(string memory name) {
        bytes32 hashedName = keccak256(bytes(name));
        bytes32 hashedVersion = keccak256(bytes("1"));

        _HASHED_NAME = hashedName;
        _HASHED_VERSION = hashedVersion;

        bytes32 typeHash = keccak256(
            "EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)"
        );
        _TYPE_HASH = typeHash;

        _CACHED_DOMAIN_SEPARATOR = _buildDomainSeparator(
            typeHash,
            hashedName,
            hashedVersion
        );
    }

    function _buildDomainSeparator(
        bytes32 typeHash,
        bytes32 nameHash,
        bytes32 versionHash
    ) private view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    typeHash,
                    nameHash,
                    versionHash,
                    block.chainid,
                    address(this)
                )
            );
    }

    function _hashTypedDataV4(bytes32 structHash)
        internal
        view
        virtual
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    _CACHED_DOMAIN_SEPARATOR,
                    structHash
                )
            );
    }
}
