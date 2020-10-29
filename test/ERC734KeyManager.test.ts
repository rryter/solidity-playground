import { MockProvider } from "ethereum-waffle";
import { utils } from "ethers";
import { Erc725Account, Erc725AccountFactory, Erc734KeyManager, Erc734KeyManagerFactory } from "../dist";

const MANAGEMENT_PURPOSE = 1;
const EXECUTE_PURPOSE = 2;
const ETH_ADDRESS = "0x44d276Ce5eFF8b68E78091B7955a6e5375422A0a";

describe("ERC734 KeyManager", () => {
  const provider = new MockProvider();
  const signer = provider.getSigner();
  const [wallet, owner] = provider.getWallets();
  const oneEth = utils.parseEther("1.0");
  const key = utils.keccak256(owner.address);

  let account: Erc725Account;
  let keyManager: Erc734KeyManager;

  beforeAll(async () => {
    account = await new Erc725AccountFactory(owner).deploy(owner.address); /*?.*/
    keyManager = await new Erc734KeyManagerFactory(owner).deploy(account.address, owner.address); /*?.*/
    await account.transferOwnership(keyManager.address); /*?.*/
  });

  it("initializes correcly", async () => {
    expect(await account.owner()).toEqual(keyManager.address); /*?.*/
    expect(await keyManager.getAllKeys()).toEqual([key]); /*?.*/

    let result = await keyManager.getKey(key); /*?.*/
    expect(result._purposes.map((purpose) => purpose.toNumber())).toEqual([1, 2]); /*?.*/

    expect(await keyManager.hasPrivilege(owner.address, MANAGEMENT_PURPOSE)).toEqual(true); /*?.*/
    expect(await keyManager.hasPrivilege(owner.address, EXECUTE_PURPOSE)).toEqual(true); /*?.*/
  });

  it("should transfer funds from the account, to a wallet", async () => {
    await wallet.sendTransaction({
      from: wallet.address,
      to: account.address,
      value: oneEth,
    }) /*?.*/;

    expect(await provider.getBalance(account.address)).toEqBN(oneEth); /*?.*/

    await keyManager.execute(
      account.interface.encodeFunctionData("execute", ["0", owner.address, oneEth, "0x00"])
    ); /*?.*/

    expect(await provider.getBalance(account.address)).toEqBN(0); /*?.*/
  });

  describe("#setKey", () => {
    it("should", async () => {
      await keyManager.setKey(owner.address, [1, 5], 1); /*?.*/

      let result = await keyManager.getKey(key); /*?.*/
      let result1 = await keyManager.getKey(key); /*?.*/
      let result2 = await keyManager.getKey(key); /*?.*/
      //   await keyManager.setKey(owner.address, [1, 5], 1); /*?.*/
      //   let result = await keyManager.getKey(key); /*?.*/
      //   expect(result._purposes.map((purpose) => purpose.toNumber())).toEqual([1, 5]); /*?.*/
      //   await keyManager.setKey(owner.address, [3], 1); /*?.*/
      //   result = await keyManager.getKey(key); /*?.*/
      //   expect(result._purposes.map((purpose) => purpose.toNumber())).toEqual([3]); /*?.*/
      //   await keyManager.setKey(owner.address, [3, 3, 4, 6, 7, 9], 1); /*?.*/
      //   result = await keyManager.getKey(key); /*?.*/
      //   expect(result._purposes.map((purpose) => purpose.toNumber())).toEqual([3, 4, 6, 7, 9]); /*?.*/
      //   await keyManager.setKey(owner.address, [4, 6], 1); /*?.*/
      //   result = await keyManager.getKey(key); /*?.*/
      //   expect(result._purposes.map((purpose) => purpose.toNumber())).toEqual([4, 6]); /*?.*/
    });
  });
});
