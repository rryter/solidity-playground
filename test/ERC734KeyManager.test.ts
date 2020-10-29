import { MockProvider } from "ethereum-waffle";
import { utils } from "ethers";
import { Erc725Account, Erc725AccountFactory, Erc734KeyManager, Erc734KeyManagerFactory } from "../typechain";

const MANAGEMENT_PURPOSE = 1;
const EXECUTION_PURPOSE = 2;
const ECDSA_TYPE = 1;
const ETH_ADDRESS = "0x44d276Ce5eFF8b68E78091B7955a6e5375422A0a";

describe("ERC734 KeyManager", () => {
  const provider = new MockProvider();
  const signer = provider.getSigner();
  const [owner, wallet] = provider.getWallets();
  const oneEth = utils.parseEther("1.0");
  const key = utils.keccak256(owner.address);

  let account: Erc725Account;
  let keyManager: Erc734KeyManager;

  beforeEach(async () => {
    account = await new Erc725AccountFactory(owner).deploy(owner.address);
    keyManager = await new Erc734KeyManagerFactory(owner).deploy(account.address, owner.address);
    await account.transferOwnership(keyManager.address);
  });

  it("initializes correcly", async () => {
    expect(await account.owner()).toEqual(keyManager.address);
    expect(await keyManager.getAllKeys()).toEqual([key]);

    let result = await keyManager.getKey(key);
    expect(result._privilegesLUT.map((purpose) => purpose.toNumber())).toEqual([1]);

    expect(await keyManager.hasPrivilege(owner.address, MANAGEMENT_PURPOSE)).toEqual(true);
  });

  it("should create management key for creator", async function () {
    const key = utils.keccak256(owner.address);
    const { _privilegesLUT, _keyType } = await keyManager.getKey(key);
    expect(_keyType.toNumber()).toEqual(ECDSA_TYPE);
    expect(_privilegesLUT.map((purpose) => purpose.toNumber())).toEqual([MANAGEMENT_PURPOSE]);

    expect(await keyManager.hasPrivilege(owner.address, MANAGEMENT_PURPOSE)).toEqual(true);
    expect(await keyManager.getAllKeys()).toHaveLength(1);
  });

  it("should be able to create new key", async () => {
    const key = utils.keccak256(wallet.address);
    await keyManager.setKey(wallet.address, [EXECUTION_PURPOSE], ECDSA_TYPE);

    const { _keyType } = await keyManager.getKey(key);
    expect(_keyType.toNumber()).toEqual(ECDSA_TYPE);

    expect(await keyManager.hasPrivilege(wallet.address, EXECUTION_PURPOSE)).toEqual(true);
  });

  it("should not be able to create invalid key", async () => {
    await keyManager.setKey(wallet.address, [], ECDSA_TYPE);
    expect(await keyManager.getAllKeys()).toHaveLength(2);
  });

  it("should not be able to create key if caller does not have management key", async () => {
    // const keyManager2 = keyManager.connect(wallet);
    expect(await keyManager.hasPrivilege(wallet.address, MANAGEMENT_PURPOSE)).toEqual(false);
    expect(await keyManager.hasPrivilege(wallet.address, EXECUTION_PURPOSE)).toEqual(false);
    await keyManager.setKey(wallet.address, [EXECUTION_PURPOSE], ECDSA_TYPE);
    expect(await keyManager.hasPrivilege(wallet.address, EXECUTION_PURPOSE)).toEqual(false);
  });

  it("should be able to remove key", async () => {
    const keys = await keyManager.getAllKeys();
    await keyManager.setKey(wallet.address, [EXECUTION_PURPOSE], ECDSA_TYPE);

    let { _keyType } = await keyManager.getKey(keys[0]);
    expect(_keyType.toNumber()).toEqual(ECDSA_TYPE);

    await keyManager.removeKey(keys[0], 0);
    ({ _keyType } = await keyManager.getKey(keys[0]));
    expect(_keyType.toNumber()).toEqual(0);
  });

  it("should transfer funds from the account, to a wallet", async () => {
    await wallet.sendTransaction({
      from: wallet.address,
      to: account.address,
      value: oneEth,
    });

    expect(await provider.getBalance(account.address)).toEqBN(oneEth);

    await keyManager.execute(account.interface.encodeFunctionData("execute", ["0", owner.address, oneEth, "0x00"]));

    expect(await provider.getBalance(account.address)).toEqBN(0);
  });

  //   describe("#setKey", () => {
  //     it("should", async () => {
  //       await keyManager.setKey(owner.address, [1, 5], 1);

  //       let result = await keyManager.getKey(key);
  //       let result1 = await keyManager.getKey(key);
  //       let result2 = await keyManager.getKey(key);
  //       //   await keyManager.setKey(owner.address, [1, 5], 1);
  //       //   let result = await keyManager.getKey(key);
  //       //   expect(result._purposes.map((purpose) => purpose.toNumber())).toEqual([1, 5]);
  //       //   await keyManager.setKey(owner.address, [3], 1);
  //       //   result = await keyManager.getKey(key);
  //       //   expect(result._purposes.map((purpose) => purpose.toNumber())).toEqual([3]);
  //       //   await keyManager.setKey(owner.address, [3, 3, 4, 6, 7, 9], 1);
  //       //   result = await keyManager.getKey(key);
  //       //   expect(result._purposes.map((purpose) => purpose.toNumber())).toEqual([3, 4, 6, 7, 9]);
  //       //   await keyManager.setKey(owner.address, [4, 6], 1);
  //       //   result = await keyManager.getKey(key);
  //       //   expect(result._purposes.map((purpose) => purpose.toNumber())).toEqual([4, 6]);
  //     });
  //   });
});

async function checkErrorRevert(promise, errorMessage) {
  let txError;
  try {
    await promise;
  } catch (err) {
    txError = err;
    if (!txError.reason) {
      const message = txError.toString().split("revert ")[1];
      expect(message).toEqual(errorMessage);
    } else {
      expect(err.reason).toEqual(errorMessage);
    }
  }
  expect(txError).toBeDefined();
}
