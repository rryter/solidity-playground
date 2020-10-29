import { MockProvider } from "ethereum-waffle";
import { utils } from "ethers";
import { Erc725Account, Erc725AccountFactory } from "../dist";

describe("ERC725 Account", () => {
  const provider = new MockProvider();
  const [wallet, owner] = provider.getWallets();
  const oneEth = utils.parseEther("1.0");
  let account: Erc725Account;
  beforeAll(async () => {
    account = await new Erc725AccountFactory(owner).deploy(owner.address); // ?.
  });

  it("initializes correctly", async () => {
    expect(await account.owner()).toEqual(owner.address);
  });

  it("should move value correctly", async () => {
    await wallet.sendTransaction({
      from: wallet.address,
      to: account.address,
      value: oneEth,
    });

    expect(await provider.getBalance(account.address)).toEqual(oneEth);
  });

  it("should set data properly", async () => {
    const tx = await account.setData(utils.formatBytes32String("name"), utils.formatBytes32String("Reto"));
    await tx.wait();
    const result = await account.getData(utils.formatBytes32String("name"));
    expect(utils.parseBytes32String(result)).toEqual("Reto");
  });
});
