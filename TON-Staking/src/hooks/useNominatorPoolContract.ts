import { useEffect, useState } from 'react';
import NominatorPool from '../contracts/NominatorPool';
import { useTonClient } from './useTonClient';
import { useAsyncInitialize } from './useAsyncInitialize';
import { useTonConnect } from './useTonConnect';
import { Address, OpenedContract } from 'ton-core';

export function useNominatorPoolContract() {
  const client = useTonClient();
  const [poolBalance, setPoolBalance] = useState<null | string>();
  const [stakingAmount, setStakingAmount] = useState<null | string>();
  const { sender } = useTonConnect();

  const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));
  const unit = Number(1000000000);
  
  const nominatorPoolContract = useAsyncInitialize(async () => {
    if (!client) return;
    const contract = new NominatorPool(
      Address.parse('EQAMP_6Dr5gdD6gwAr-B58aCoK7hBF0QlWRlldVWC6EDY-qk') // replace with your address from tutorial 2 step 8
    );
    return client.open(contract) as OpenedContract<NominatorPool>;
  }, [client]);

  useEffect(() => {
    async function getBalance() {
      if (!nominatorPoolContract) return;
      setPoolBalance(null);
      setStakingAmount(null);
      
      const balance = await nominatorPoolContract.getBalance();
      setPoolBalance((Number(balance.items[0].value) / unit).toString());
      setStakingAmount((Number(balance.items[1].value) / unit).toString());
      
      await sleep(5000); // sleep 5 seconds and poll value again
      getBalance();
    }

    async function getNominatorsList() {
      if (!nominatorPoolContract) return;
      
      await nominatorPoolContract.getNominatorsList();
      
      await sleep(5000); // sleep 5 seconds and poll value again
      getNominatorsList();
    }

    getBalance();
    // getNominatorsList();
  }, [nominatorPoolContract]);

  return {
    poolBalance: poolBalance,
    stakingAmount: stakingAmount,
    address: nominatorPoolContract?.address.toString(),
    deposit: (amount: number) => {
      return nominatorPoolContract?.sendDeposit(sender, amount);
    },
    withdraw: (amount: number) => {
      return nominatorPoolContract?.sendWithdraw(sender, amount);
    },
  };
}
