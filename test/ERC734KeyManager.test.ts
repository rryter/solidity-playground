import { loadFixture, MockProvider } from "ethereum-waffle";
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

  beforeAll(async () => {});

  async function fixture([wallet, other], provider) {
    let account = await new Erc725AccountFactory(owner).deploy(owner.address);
    let keyManager = await new Erc734KeyManagerFactory(owner).deploy(account.address, owner.address);
    await account.transferOwnership(keyManager.address);
    return { account, keyManager };
  }

  it("should initialize correctly", async () => {
    const { account, keyManager } = await loadFixture(fixture);
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
      const { account, keyManager } = await loadFixture(fixture);
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

        const { account, keyManager } = await loadFixture(fixture);
        await keyManager.setKey(owner.address, input, ECDSA_TYPE);
        let result = await keyManager.getKey(key);
        expect(getPrivilegesArray(result)).toEqual(output);
      }
    });

    it("should not be able to create key if caller does not have management key", async () => {
      // const keyManager2 = keyManager.connect(wallet);
      const { account, keyManager } = await loadFixture(fixture);
      expect(await keyManager.hasPrivilege(wallet.address, MANAGEMENT_PURPOSE)).toEqual(false);
      expect(await keyManager.hasPrivilege(wallet.address, EXECUTION_PURPOSE)).toEqual(false);
      await keyManager.setKey(wallet.address, [EXECUTION_PURPOSE], ECDSA_TYPE);
      expect(await keyManager.hasPrivilege(wallet.address, EXECUTION_PURPOSE)).toEqual(true);
    });
  });

  describe("removeKey()", () => {
    it("should remove a key successfuly", async () => {
      const { account, keyManager } = await loadFixture(fixture);
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
      const { account, keyManager } = await loadFixture(fixture);
      await keyManager.setKey(owner.address, [EXECUTION_PURPOSE], ECDSA_TYPE);
      await wallet.sendTransaction({
        from: wallet.address,
        to: account.address,
        value: oneEth,
      });

      expect(await provider.getBalance(account.address)).toEqBN(oneEth);

      await keyManager.execute(account.interface.encodeFunctionData("execute", ["0", owner.address, oneEth, "0x00"]));

      expect(await provider.getBalance(account.address)).toEqBN(0);
    });
  });
});

function getPrivilegesArray(result): number[] {
  return result._privilegesLUT.map((purpose) => purpose.toNumber());
}
