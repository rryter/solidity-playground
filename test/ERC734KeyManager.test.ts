import { utils } from "ethers";
import { ethers } from "hardhat";
import { Erc725Account, Erc725AccountFactory, Erc734KeyManager, Erc734KeyManagerFactory } from "../typechain";

const MANAGEMENT_PURPOSE = 1;
const EXECUTION_PURPOSE = 2;
const ECDSA_TYPE = 1;

describe("ERC734 KeyManager", () => {
  let wallet, owner;
  let account: Erc725Account;
  let keyManager: Erc734KeyManager;
  let key;
  const oneEth = utils.parseEther("1.0");

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0];
    wallet = signers[1];

    key = utils.keccak256(owner.address);

    account = await new Erc725AccountFactory(owner).deploy(owner.address);
    keyManager = await new Erc734KeyManagerFactory(owner).deploy(account.address, owner.address);

    await account.transferOwnership(keyManager.address);
  });

  it("should initialize correctly", async () => {
    expect(await account.owner()).toEqual(keyManager.address);

    const keys = await keyManager.getAllKeys();
    expect(keys).toEqual([key]);
    expect(keys).toHaveLength(1);

    let result = await keyManager.getKey(key);
    expect(result._privilegesLUT.map((purpose) => purpose.toNumber())).toEqual([1]);

    expect(await keyManager.hasPrivilege(owner.address, MANAGEMENT_PURPOSE)).toEqual(true);
  });

  describe("setKey()", () => {
    it("should be able to create new key", async () => {
      const key = utils.keccak256(wallet.address);
      await keyManager.setKey(wallet.address, [EXECUTION_PURPOSE], ECDSA_TYPE);

      const { _keyType } = await keyManager.getKey(key);
      expect(_keyType.toNumber()).toEqual(ECDSA_TYPE);

      expect(await keyManager.hasPrivilege(wallet.address, EXECUTION_PURPOSE)).toEqual(true);
    });

    it("should set the privileges and filter duplicates", async () => {
      // prettier-ignore
      const privileges = [
            [1, 5], 
            [3], 
            [3, 3, 4, 6, 7, 9], 
            [3, 4, 6, 7, 9], 
            [4, 6], 
            []
        ];
      // prettier-ignore-end
      for (let i = 0; i < privileges.length; i++) {
        const input = privileges[i];
        const output = Array.from(new Set(input));
        key = utils.keccak256(wallet.address);
        await keyManager.setKey(wallet.address, input, ECDSA_TYPE);
        let result = await keyManager.getKey(key);
        expect(getPrivilegesArray(result)).toEqual(output);
      }
    });

    it("should not be able to create key if caller does not have management key", async () => {
      const keyManagerFromWallet = keyManager.connect(wallet.address);
      expect(await keyManagerFromWallet.hasPrivilege(wallet.address, MANAGEMENT_PURPOSE)).toEqual(false);
      expect(await keyManagerFromWallet.hasPrivilege(wallet.address, EXECUTION_PURPOSE)).toEqual(false);
      await expect(keyManagerFromWallet.setKey(wallet.address, [EXECUTION_PURPOSE], ECDSA_TYPE)).toBeReverted();
      expect(await keyManagerFromWallet.hasPrivilege(wallet.address, EXECUTION_PURPOSE)).toEqual(false);
    });
  });

  describe("removeKey()", () => {
    it("should remove a key successfuly", async () => {
      const keys = await keyManager.getAllKeys();
      await keyManager.setKey(wallet.address, [EXECUTION_PURPOSE], ECDSA_TYPE);

      let { _keyType } = await keyManager.getKey(keys[0]);
      expect(_keyType.toNumber()).toEqual(ECDSA_TYPE);

      await keyManager.removeKey(keys[0], 0);
      ({ _keyType } = await keyManager.getKey(keys[0]));
      expect(_keyType.toNumber()).toEqual(0);
    });
  });

  describe("value transfers", () => {
    it("should transfer funds from the account, to a wallet", async () => {
      await keyManager.setKey(owner.address, [EXECUTION_PURPOSE], ECDSA_TYPE);
      await wallet.sendTransaction({
        from: wallet.address,
        to: account.address,
        value: oneEth,
      });

      expect(await ethers.provider.getBalance(account.address)).toEqBN(oneEth);

      await keyManager.execute(account.interface.encodeFunctionData("execute", ["0", owner.address, oneEth, "0x00"]));
      expect(await ethers.provider.getBalance(account.address)).toEqBN(0);
    });
  });
});

function getPrivilegesArray(result): number[] {
  return result._privilegesLUT.map((purpose) => purpose.toNumber());
}
