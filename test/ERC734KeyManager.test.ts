import { deployContract, loadFixture, MockProvider } from "ethereum-waffle";
import { BigNumber, utils } from "ethers";
import ERC725AccountArtifact from "../artifacts/ERC725Account.json";
import ERC734KeyManagerArtifact from "../artifacts/ERC734KeyManager.json";
import { Erc725Account, Erc734KeyManager } from "../types/index";

const MANAGEMENT_PURPOSE = 1;
const EXECUTE_PURPOSE = 2;

describe("ERC734 KeyManager", () => {
  const provider = new MockProvider();
  const [wallet, owner] = provider.getWallets();
  const oneEth = utils.parseEther("1.0");
  const key = utils.keccak256(owner.address);

  async function fixture([wallet]: any[]) {
    const account = (await deployContract(owner, ERC725AccountArtifact, [owner.address])) as Erc725Account;
    const keyManager = (await deployContract(owner, ERC734KeyManagerArtifact, [
      account.address,
      owner.address,
    ])) as Erc734KeyManager;
    await account.transferOwnership(keyManager.address);
    return { account, keyManager, wallet };
  }

  it("initializes correcly", async () => {
    const { account, keyManager } = await loadFixture(fixture);

    expect(await account.owner()).toEqual(keyManager.address);
    expect(await keyManager.getAllKeys()).toEqual([key]);
    expect(await keyManager.keyHasPurpose(key, MANAGEMENT_PURPOSE)).toEqual(true);
    expect(await keyManager.keyHasPurpose(key, EXECUTE_PURPOSE)).toEqual(false);
  });

  it("should transfer funds from the account, to a wallet", async () => {
    const { account, keyManager } = await loadFixture(fixture);

    await wallet.sendTransaction({
      from: wallet.address,
      to: account.address,
      value: oneEth,
    });

    expect(await provider.getBalance(account.address)).toEqBN(oneEth);

    const abi = account.interface.encodeFunctionData("execute", ["0", owner.address, oneEth, "0x00"]);
    const tx = await keyManager.execute(abi);
    await tx.wait();

    expect(await provider.getBalance(account.address)).toEqBN(0);
  });
});
