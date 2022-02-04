import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { setupUsers } from './utils';
import { signMetaTxRequest } from '../../../src/index';

const deployContracts = async () => {
  const Forwarder = await ethers.getContractFactory('Forwarder');
  const forwarder = await Forwarder.deploy();
  await forwarder.deployed();

  const Counter = await ethers.getContractFactory('Counter');
  const counter = await Counter.deploy(forwarder.address);
  await counter.deployed();

  const signers = await ethers.getSigners();

  const users = await setupUsers(
    signers.map((signer) => signer.address),
    {
      counter,
      forwarder,
    },
  );

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
        forwarder,
        users: [relayer, account],
      } = fixtures;

      const data = counter.interface.encodeFunctionData('increment', []);

      const _forwarder = Object.assign(forwarder, { name: 'TestForwarder' });

      const { signature, request } = await signMetaTxRequest(
        account.counter.provider,
        31337,
        {
          to: counter.address,
          from: account.address,
          data,
        },
        _forwarder,
      );

      const tx = await relayer.forwarder.executeTrusted(request, signature);
      await tx.wait();

      expect(await counter.count(account.address)).to.equal(2);
    });

    it('increments with forwarder and permissionless relayer', async function () {
      const {
        counter,
        forwarder,
        users: [relayer, account],
      } = fixtures;

      const data = counter.interface.encodeFunctionData('increment', []);

      const _forwarder = Object.assign(forwarder, { name: 'TestForwarder' });

      const { signature, request } = await signMetaTxRequest(
        account.counter.provider,
        31337,
        {
          to: counter.address,
          from: account.address,
          data,
        },
        _forwarder,
      );

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

      expect(account.counter.incrementFromForwarderOnly()).to.be.revertedWith(
        '429',
      );
    });

    it('increments with forwarder and trusted relayer', async function () {
      const {
        counter,
        forwarder,
        users: [relayer, account],
      } = fixtures;

      const data = counter.interface.encodeFunctionData(
        'incrementFromForwarderOnly',
        [],
      );

      const _forwarder = Object.assign(forwarder, { name: 'TestForwarder' });

      const { signature, request } = await signMetaTxRequest(
        account.counter.provider,
        31337,
        {
          to: counter.address,
          from: account.address,
          data,
        },
        _forwarder,
      );

      const tx = await relayer.forwarder.executeTrusted(request, signature);
      await tx.wait();

      expect(await counter.count(account.address)).to.equal(1);
    });

    it('increments with forwarder and permissionless relayer', async function () {
      const {
        counter,
        forwarder,
        users: [relayer, account],
      } = fixtures;

      const data = counter.interface.encodeFunctionData(
        'incrementFromForwarderOnly',
        [],
      );

      const _forwarder = Object.assign(forwarder, { name: 'TestForwarder' });

      const { signature, request } = await signMetaTxRequest(
        account.counter.provider,
        31337,
        {
          to: counter.address,
          from: account.address,
          data,
        },
        _forwarder,
      );

      const tx = await relayer.forwarder.execute(request, signature);
      await tx.wait();

      expect(await counter.count(account.address)).to.equal(2);
    });
  });
});
