import { utils, Wallet } from "ethers";
import { ERC725Account, ERC725AccountFactory } from "../typechain";
import { ethers } from "hardhat";

describe("ERC725 Account", () => {
  let wallet: Wallet;
  let owner: Wallet;
  const oneEth = utils.parseEther("1.0");
  let account: ERC725Account;

  beforeAll(async () => {
    const signers = await ethers.getSigners();
    wallet = signers[0];
    owner = signers[1];
    account = await new ERC725AccountFactory(owner).deploy(owner.address);
  });

  it("initializes correctly", async () => {
    expect(await account.owner()).toEqual(owner.address);
  });

  it("should move value correctly", async () => {
    await wallet.sendTransaction({
      from: wallet.address,
      to: account.address,
      value: oneEth
    });

    expect(await ethers.provider.getBalance(account.address)).toEqual(oneEth);
  });

  it("should set data properly", async () => {
    const tx = await account.setData(utils.formatBytes32String("name"), utils.formatBytes32String("Reto"));
    await tx.wait();
    const result = await account.getData(utils.formatBytes32String("name"));
    expect(utils.parseBytes32String(result)).toEqual("Reto");
  });

  it("should set an array of data", async () => {
    const tx = await account.setDataWithArray([
      { key: utils.formatBytes32String("name1"), value: utils.formatBytes32String("Reto 1") },
      { key: utils.formatBytes32String("name2"), value: utils.formatBytes32String("Reto 2") }
    ]);
    await tx.wait();
    const result1 = await account.getData(utils.formatBytes32String("name1"));
    const result2 = await account.getData(utils.formatBytes32String("name2"));
    expect(utils.parseBytes32String(result1)).toEqual("Reto 1");
    expect(utils.parseBytes32String(result2)).toEqual("Reto 2");
  });
});
