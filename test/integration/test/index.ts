import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { setupUsers } from './utils';
import { wrapContract } from '../../../src/index';

const NAME = 'TestForwarder';

const deployContracts = async () => {
  const Forwarder = await ethers.getContractFactory('EssentialForwarder');
  const forwarder = await Forwarder.deploy(NAME);
  await forwarder.deployed();

  const Counter = await ethers.getContractFactory('Counter');
  const counter = await Counter.deploy(forwarder.address);
  await counter.deployed();

  const signers = await ethers.getSigners();

  const users = (await setupUsers(
    signers.map((signer) => signer.address),
    {
      counter,
      forwarder,
    },
  )) as any[];

  users.map((user) => {
    const { address, counter, forwarder } = user;

    const wrappedCounter = wrapContract(
      counter.provider,
      address,
      counter,
      Object.assign(forwarder, { name: NAME }),
    ) as Contract;

    user.wrappedCounter = wrappedCounter;
  });

  return {
    counter,
    forwarder,
    users,
  };
};

describe('Counter', function () {
  let fixtures: {
    counter: Contract;
    forwarder: Contract;
    users: ({
      address: string;
    } & {
      counter: Contract;
      forwarder: Contract;
      wrappedCounter: Contract;
    })[];
  };

  before(async () => {
    fixtures = await deployContracts();
  });

  it('Starts at 0', async function () {
    const {
      counter,
      users: [_relayer, account],
    } = fixtures;

    expect(await counter.count(account.address)).to.equal(0);
  });

  describe('increment', async () => {
    before(async () => {
      fixtures = await deployContracts();
    });

    it('increments permissionlessly', async function () {
      const {
        counter,
        users: [_relayer, account],
      } = fixtures;

      await account.counter.increment();

      expect(await counter.count(account.address)).to.equal(1);
    });

    it('increments with forwarder and trusted relayer', async function () {
      const {
        counter,
        users: [relayer, account],
      } = fixtures;

      const { signature, request } = await account.wrappedCounter.increment();

      const tx = await relayer.forwarder.executeTrusted(request, signature);
      await tx.wait();

      expect(await counter.count(account.address)).to.equal(2);
    });

    it('increments with forwarder and permissionless relayer', async function () {
      const {
        counter,
        users: [relayer, account],
      } = fixtures;

      const { signature, request } = await account.wrappedCounter.increment();

      const tx = await relayer.forwarder.execute(request, signature);
      await tx.wait();

      expect(await counter.count(account.address)).to.equal(3);
    });
  });

  describe('incrementFromForwarderOnly', async () => {
    before(async () => {
      fixtures = await deployContracts();
    });

    it('reverts if called outside of forwarder', async function () {
      const {
        users: [_relayer, account],
      } = fixtures;

      await expect(
        account.counter.incrementFromForwarderOnly(),
      ).to.be.revertedWith('429');
    });

    it('does not increment with forwarder and permissionless relayer', async function () {
      const {
        counter,
        users: [relayer, account],
      } = fixtures;

      const { signature, request } =
        await account.wrappedCounter.incrementFromForwarderOnly();

      // this should probably revert?
      // await expect(
      //   const tx = await relayer.forwarder.execute(request, signature);
      // ).to.be.revertedWith('429');

      const tx = await relayer.forwarder.execute(request, signature);

      await tx.wait();

      const count = await counter.count(account.address);
      expect(count).to.equal(0);
    });

    it('increments with forwarder and trusted relayer', async function () {
      const {
        counter,
        users: [relayer, account],
      } = fixtures;

      const { signature, request } =
        await account.wrappedCounter.incrementFromForwarderOnly();

      const tx = await relayer.forwarder.executeTrusted(request, signature);
      await tx.wait();
      const count = await counter.count(account.address);
      expect(count).to.equal(1);
    });
  });
});
