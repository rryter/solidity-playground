// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.7;

import "hardhat/console.sol";

// interfaces
import "./../IERC1271.sol";
import "../ERC725/IERC725X.sol";

// modules
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// libraries
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// NOTE: this contract is not fully tested!

contract ERC734KeyManager is ERC165, IERC1271, AccessControl {
    using ECDSA for bytes32;
    using SafeMath for uint256;

    event KeySet(bytes32 indexed key, uint256[] indexed purposes, uint256 indexed keyType, address keyAddress);
    event KeyRemoved(bytes32 indexed key, uint256[] indexed purposes, uint256 indexed keyType, address keyAddress);
    event Executed(uint256 indexed _value, bytes _data);

    bytes4 internal constant _INTERFACE_ID_ERC1271 = 0x1626ba7e;
    bytes4 internal constant _ERC1271FAILVALUE = 0xffffffff;
    bool internal initialized;

    uint256 public constant MANAGEMENT_KEY = 1;
    uint256 public constant EXECUTION_KEY = 2;

    uint256 public constant ECDSA_TYPE = 1;
    uint256 public constant RSA_TYPE = 2;

    struct Key {
        mapping(uint256 => bool) privileges;
        uint256[] privilegesLUT;
        uint256 keyType;
        address keyAddress;
    }

    mapping(bytes32 => Key) internal keysMapping;
    bytes32[] public keys;

    IERC725X public account;

    modifier onlyManagementKeyOrSelf() {
        if (msg.sender != address(this)) {
            require(hasPrivilege(msg.sender, MANAGEMENT_KEY), "sender-must-have-management-key");
        }
        _;
    }

    constructor(address _account, address _newOwner) public {
        require(!initialized, "already-initialized");
        account = IERC725X(_account);
        initialized = true;
        uint256[] storage _purposes;
        _purposes.push(MANAGEMENT_KEY);

        bytes32 _key = keccak256(abi.encodePacked(_newOwner));
        keys.push(_key);
        keysMapping[_key].keyAddress = _newOwner;
        keysMapping[_key].keyType = ECDSA_TYPE;
        keysMapping[_key].privilegesLUT.push(MANAGEMENT_KEY);
        keysMapping[_key].privileges[MANAGEMENT_KEY] = true;

        _registerInterface(_INTERFACE_ID_ERC1271);
    }

    function execute(bytes calldata _data) external payable {
        bool isExecutor = hasPrivilege(msg.sender, EXECUTION_KEY) || hasPrivilege(msg.sender, MANAGEMENT_KEY);
        require(isExecutor, "Only executors");
        (bool success, ) = address(account).call{value: msg.value, gas: gasleft()}(_data);
        console.log("function execute: sucess ->", success);
        emit Executed(msg.value, _data);
    }

    function getKey(bytes32 _key)
        public
        view
        returns (
            uint256[] memory _privilegesLUT,
            uint256 _keyType,
            address _keyAddress
        )
    {
        return (keysMapping[_key].privilegesLUT, keysMapping[_key].keyType, keysMapping[_key].keyAddress);
    }

    function hasPrivilege(address _address, uint256 _purpose) public view returns (bool) {
        bytes32 _key = keccak256(abi.encodePacked(_address));
        return keysMapping[_key].privileges[_purpose] != false;
    }

    function setKey(
        address _address,
        uint256[] memory _purposes,
        uint256 _keyType
    ) public onlyManagementKeyOrSelf {
        bytes32 _key = keccak256(abi.encodePacked(_address));
        require(_key != 0x0, "invalid-key");

        if (keysMapping[_key].keyAddress == address(0x0)) {
            keys.push(_key);
        }

        for (uint256 i = 0; i < keysMapping[_key].privilegesLUT.length; i++) {
            delete keysMapping[_key].privileges[keysMapping[_key].privilegesLUT[i]];
        }

        delete keysMapping[_key].privilegesLUT;

        for (uint256 i = 0; i < _purposes.length; i++) {
            if (keysMapping[_key].privileges[_purposes[i]] == false) {
                keysMapping[_key].privilegesLUT.push(_purposes[i]);
                keysMapping[_key].privileges[_purposes[i]] = true;
            }
        }

        keysMapping[_key].keyAddress = _address;
        keysMapping[_key].keyType = _keyType;

        emit KeySet(_key, _purposes, _keyType, _address);
    }

    function removeKey(bytes32 _key, uint256 i) public onlyManagementKeyOrSelf {
        require(_key != 0x0, "invalid-key");
        Key memory key = keysMapping[_key];
        delete keysMapping[_key];

        while (i < keys.length - 1) {
            keys[i] = keys[i + 1];
            i++;
        }
        keys.pop();

        emit KeyRemoved(_key, key.privilegesLUT, key.keyType, key.keyAddress); // TODO: It's probably a security risk, I have to read up on Events.
    }

    function getAllKeys() public view returns (bytes32[] memory) {
        return keys;
    }

    /**
     * @notice Checks if an owner signed `_data`.
     * ERC1271 interface.
     *
     * @param _hash hash of the data signed//Arbitrary length data signed on the behalf of address(this)
     * @param _signature owner's signature(s) of the data
     */
    function isValidSignature(bytes32 _hash, bytes memory _signature) public override view returns (bytes4 magicValue) {
        address recoveredAddress = ECDSA.recover(_hash, _signature);
        return (hasPrivilege(recoveredAddress, EXECUTION_KEY)) ? _INTERFACE_ID_ERC1271 : _ERC1271FAILVALUE;
    }
}
