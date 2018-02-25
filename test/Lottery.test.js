const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const provider = ganache.provider();

const web3 = new Web3(provider);

const { interface, bytecode } = require('../compile.js');

let lottery;
let accounts;

beforeEach(async () => {
  // Get all accounts
  accounts = await web3.eth.getAccounts();

  // Deploy contract
  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({
      from: accounts[0],
      gas: '1000000',
    });
})

describe('Lottery', () => {
  it('deploys succesfully', () => {
    assert.ok(lottery.options.address);
  });

  it('adds account from where is deployed as manager', async () => {
    const manager = await lottery.methods.manager().call();
    assert.equal(manager, accounts[0]);
  });

  it('allows on account to enter', async () => {
    await enterLottery(0);

    const players = await lottery.methods.getPlayers().call();
    assert.equal(accounts[0], players[0]);
    assert.equal(1, players.length);
  });

  it('allows multiple accounts to enter', async () => {
    const amountOfAccounts = 3;

    for (var i = 0; i < amountOfAccounts; i++) {
      await enterLottery(i);
    }

    const players = await lottery.methods.getPlayers().call();
    for (var i = 0; i < amountOfAccounts; i++) {
      assert.equal(accounts[i], players[i]);
    }
    assert.equal(amountOfAccounts, players.length);
  });

  it('requires a minimum amount of ether to enter', async () => {
    try {
      await enterLottery(0, '0');
    } catch (error) {
      assert(error);
      return;
    }
    assert(false);
  });

  it('assures non-manager cannot call pickWinner', async () => {
    await enterLottery(1);

    try {
      await lottery.methods.pickWinner().send({
        from: accounts[1],
      });
    } catch (error) {
      assert(error);
      return;
    }
    assert(false);
  });

  it('sends money to winner', async () => {
    await enterLottery(1);

    const initialBalance = await web3.eth.getBalance(accounts[1]);
    await lottery.methods.pickWinner().send({
      from: accounts[0],
    });
    const afterBalance = await web3.eth.getBalance(accounts[1]);

    assert((afterBalance - 0.01), initialBalance);
  });

  it('resets the player array after winner is chosen', async () => {
    await enterLottery(1);

    await lottery.methods.pickWinner().send({
      from: accounts[0],
    });

    assert.equal(lottery.methods.getPlayers.length, 0);
  });


  it('asserts contract balance is zero after winner is chosen', async () => {
    await enterLottery(1);

    await lottery.methods.pickWinner().send({
      from: accounts[0],
    });

    const contractBalance = await web3.eth.getBalance(lottery.options.address);
    assert.equal(contractBalance, 0);
  })

});

enterLottery = async (accountIndex, amountOfEther = '0.01') => {
  await lottery.methods.enter().send({
    from: accounts[accountIndex],
    value: web3.utils.toWei(amountOfEther, 'ether'),
  });
}
