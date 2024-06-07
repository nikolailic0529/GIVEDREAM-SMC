import { Contract, ContractProvider, Sender, Address, Cell, contractAddress, beginCell } from "ton-core";

export default class NominatorPool implements Contract {

	static createForDeploy(code: Cell, owner: Address): NominatorPool {
		const data = beginCell()
			.storeAddress(owner)
			.storeCoins(0)
			.storeBit(0)
			.endCell();
		const workchain = 0; // deploy to workchain 0
		const address = contractAddress(workchain, { code, data });
		return new NominatorPool(address, { code, data });
	}
	
	constructor(readonly address: Address, readonly init?: { code: Cell, data: Cell }) {}

	async sendDeploy(provider: ContractProvider, via: Sender) {
		await provider.internal(via, {
			value: "0.005", // send 0.01 TON to contract for rent
			bounce: false
		});
	}

	async sendDeposit(provider: ContractProvider, via: Sender, amount: number) {
		const messageBody = beginCell()
			.storeUint(1, 32) // op:deposit
			.endCell();
		await provider.internal(via, {
			value: amount.toString(), // send 0.002 TON for gas
			body: messageBody
		});
	}

	async sendWithdraw(provider: ContractProvider, via: Sender, amount: number) {
		const messageBody = beginCell()
			.storeUint(2, 32) // op:withdraw
			.storeCoins(amount * 1000000000)
			.endCell();
		await provider.internal(via, {
			value: "0.02", 
			body: messageBody
		});
	}

	async getNominatorsList(provider: ContractProvider) {
		const { stack } = await provider.get("nominators_list", []);
		// console.log('nominators_list:', stack)
		return stack;
	}

	async getBalance(provider: ContractProvider) {
		const { stack } = await provider.get("balance", []);
		return stack;
	}
}