/**
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity >=0.4.22 <0.8.0;

/**
 * @title Vault
 * @dev Timelocked Vault
 */
contract SmartVault {
    enum WeekDay {
        Monday,
        Tuesday,
        Wednesday,
        Thursday,
        Friday,
        Saturday,
        Sunday
    }
    uint256 lockedAt;
    uint256 funds;
    address owner;

    modifier ownerOnly() {
        require(msg.sender == owner);
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function isLocked() public view returns (bool) {
        WeekDay today = WeekDay((block.timestamp / 86400 + 4) % 7);
        uint256 currentHour = ((block.timestamp / 60 / 60) % 24) + 2;

        if (!(today == WeekDay.Tuesday && currentHour == 19)) {
            return true;
        } else {
            return false;
        }
    }

    function lockFunds() public payable returns (uint256) {
        require(msg.value > 1, "Not enough Ether provided.");

        lockedAt = block.timestamp;
        funds = funds + msg.value;

        return funds;
    }

    function withdraw(uint256 amount) public ownerOnly {
        require(!isLocked(), "The Vault is locked.");
        require(funds > 0, "The Vault is empty.");

        uint256 withdrawalAmount;

        if (amount > 0) {
            withdrawalAmount = amount * 10**18;
        } else {
            withdrawalAmount = funds;
        }

        require(funds >= withdrawalAmount, "Not enough funds.");

        funds = funds - withdrawalAmount;
        msg.sender.transfer(withdrawalAmount);
    }

    function getBalance() public view returns (uint256) {
        return funds;
    }
}
