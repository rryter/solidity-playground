// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.0;

import "hardhat/console.sol";

// interfaces
import "./IERC1271.sol";
import "./IERC725X.sol";

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

    bytes4 internal constant _INTERFACE_ID_ERC1271 = 0x1626ba7e;
    bytes4 internal constant _ERC1271FAILVALUE = 0xffffffff;

    event KeySet(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType, address keyAddress);
    event KeyRemoved(bytes32 indexed key, uint256 indexed purpose, uint256 indexed keyType, address keyAddress);
    event Executed(uint256 indexed _value, bytes _data);

    uint256 constant MANAGEMENT_KEY = 1;
    uint256 constant EXECUTION_KEY = 2;

    uint256 constant ECDSA_TYPE = 1;
    uint256 constant RSA_TYPE = 2;

    struct Key {
        // A purpose is represented via bitmasks
        // Maximum number of a purpose is 256 and must be an integer that is power of 2 e.g.:
        // 1, 2, 4, 8, 16, 32, 64 ...
        // All other integers represent multiple purposes e.g:
        // Integer 3 (011) represent both 1 (001) and 2 (010) purpose
        uint256 purpose;
        uint256 keyType;
        address keyAddress;
    }

    IERC725X public Account;

    mapping(bytes32 => Key) priviliges;
    bytes32[] public keys;

    bool initialized;

    modifier onlyManagementKeyOrSelf() {
        if (msg.sender != address(this)) {
            console.log(msg.sender);
            require(hasPrivilege(msg.sender, MANAGEMENT_KEY), "sender-must-have-management-key");
        }
        _;
    }

    constructor(address _account, address _newOwner) public {
        require(!initialized, "contract-already-initialized");
        Account = IERC725X(_account);
        initialized = true;
        bytes32 key = keccak256(abi.encodePacked(_newOwner));

        priviliges[key] = Key({keyType: ECDSA_TYPE, purpose: MANAGEMENT_KEY, keyAddress: _newOwner});
        keys = [key];

        _registerInterface(_INTERFACE_ID_ERC1271);
    }

    function execute(bytes calldata _data) external payable {
        bool isExecutor = hasPrivilege(msg.sender, EXECUTION_KEY) || hasPrivilege(msg.sender, MANAGEMENT_KEY);
        require(isExecutor, "Only executors are allowed to perform execute");
        address(Account).call{value: msg.value, gas: gasleft()}(_data); //(success, ) =
        emit Executed(msg.value, _data);
    }

    function getKey(bytes32 _key)
        public
        view
        returns (
            uint256 _purpose,
            uint256 _keyType,
            address _keyAddress
        )
    {
        return (priviliges[_key].purpose, priviliges[_key].keyType, priviliges[_key].keyAddress);
    }

    function hasPrivilege(address _address, uint256 _purpose) public view returns (bool) {
        bytes32 _key = keccak256(abi.encodePacked(_address));
        // Only purposes that are power of 2 are allowed e.g.:
        // 1, 2, 4, 8, 16, 32, 64 ...
        // Integers that represent multiple purposes are not allowed
        require(_purpose != 0 && (_purpose & (_purpose - uint256(1))) == 0, "purpose-must-be-power-of-2");
        return (priviliges[_key].purpose & _purpose) != 0;
    }

    function setKey(
        address _address,
        uint256 _purpose,
        uint256 _keyType
    ) public onlyManagementKeyOrSelf {
        bytes32 _key = keccak256(abi.encodePacked(_address));
        require(_key != 0x0, "invalid-key");
        priviliges[_key].purpose = _purpose;
        priviliges[_key].keyAddress = _address;
        priviliges[_key].keyType = _keyType;

        if (priviliges[_key].purpose > 0) {
            keys.push(_key);
        }

        emit KeySet(_key, _purpose, _keyType, _address); // TODO: It's probably a security risk, I have to read up on Events.
    }

    function removeKey(bytes32 _key, uint256 i) public onlyManagementKeyOrSelf {
        require(_key != 0x0, "invalid-key");
        Key memory key = priviliges[_key];
        delete priviliges[_key];

        while (i < keys.length - 1) {
            keys[i] = keys[i + 1];
            i++;
        }
        keys.pop();

        emit KeyRemoved(_key, key.purpose, key.keyType, key.keyAddress); // TODO: It's probably a security risk, I have to read up on Events.
    }

    function getAllKeys() public view returns (bytes32[] memory) {
        require(hasPrivilege(msg.sender, MANAGEMENT_KEY), "Only managers are allowed to read all the keys");
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
