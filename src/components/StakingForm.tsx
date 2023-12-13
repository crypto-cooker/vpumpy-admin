import { useEffect, useState } from "react";
import { VenomConnect } from "venom-connect";
import { Address, ProviderRpcClient } from "everscale-inpage-provider";

// we will user bignumber library to operate with deposit values (remember about decimals multiply)
import BigNumber from "bignumber.js";

// Importing of our contract ABI from smart-contract build action. Of cource we need ABI for contracts calls.
import stakingAbi from "../abi/Staking.abi.json";
import tokenRootAbi from "../abi/TokenRoot.abi.json";
import tokenWalletAbi from "../abi/TokenWallet.abi.json";
import { STAKING_ADDR, TOKEN_ROOT } from "../utils/constant";

type Props = {
  venomConnect: VenomConnect | undefined;
  address: string | undefined;
  provider: ProviderRpcClient | undefined;
};

function StakingForm({ venomConnect, address, provider }: Props) {
  const [depositTokenAmount, setDepositTokenAmount] = useState<number | undefined>();
  const [withdrawTokenAmount, setWithdrawTokenAmount] = useState<number | undefined>();
  const [newOwner, setNewOwner] = useState<string | undefined>();
  const [stakingContract, setStakingContract] = useState<any>();
  const [tokenRootContract, setTokenRootContract] = useState<any>();
  const [tokenWalletContract, setTokenWalletContract] = useState<any>();
  const [stakingAddress, setStakingAddress] = useState(STAKING_ADDR);
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [totalStakedNftCount, setTotalStakedNFTCount] = useState(0);
  const [totalStakedAmount, setTotalStakedAmount] = useState(0);
  const [stakes, setStakes] = useState([]);
  const onChangeDepositAmount = (e: string) => {
    if (e === "") setDepositTokenAmount(undefined);
    setDepositTokenAmount(Number(e));
  };

  const onChangeWithdrawAmount = (e: string) => {
    if (e === "") setWithdrawTokenAmount(undefined);
    setWithdrawTokenAmount(Number(e));
  };

  const onChangeNewOwner = (e: string) => {
    if (e === "") setNewOwner(undefined);
    setNewOwner(e);
  };

  useEffect(()=> {
    if(provider) {
      const contractAddress = new Address(stakingAddress); // Our Staking contract address
      const contractInstance = new provider.Contract(stakingAbi, contractAddress);
      setStakingContract(contractInstance);

      const tokenRootAddress = new Address(TOKEN_ROOT); // Our token root address
      const tokenRootInstance = new provider.Contract(tokenRootAbi, tokenRootAddress);
      setTokenRootContract(tokenRootInstance);
    }
  }, [provider])

  useEffect(()=> {
    if(provider && address && tokenRootContract) {
      (async() => {
        try {
          const tokenWalletAddress = (await tokenRootContract.methods.walletOf({answerId: 0, walletOwner: address}).call()).value0;
          const tokenWalletInstance = new provider.Contract(tokenWalletAbi, tokenWalletAddress);
          setTokenWalletContract(tokenWalletInstance);
        } catch (error) {
          console.log(error)
        }
      })();
    }
  }, [provider, address, tokenRootContract])
  
  const getStakingInfo = async () => {
    try {
      const { totalStakedNftCount } = await stakingContract.methods
        .totalStakedNftCount({}).call();
        setTotalStakedNFTCount(totalStakedNftCount);
        const { totalStakedAmount } = await stakingContract.methods
        .totalStakedAmount({}).call();
        setTotalStakedAmount(totalStakedAmount);
      const { stakes } = await stakingContract.methods
        .stakes({}).call();
        setStakes(stakes);
    } catch (error) {
      console.log(error, "GREAT")
    }
  }

  useEffect(()=> {
    if(stakingContract && tokenWalletContract && address) {
      getStakingInfo();
    }
  }, [stakingContract, address, tokenWalletContract])

  const claimTokens = async () => {
    if(!stakingContract || !address) return;
    try {
      setIsClaiming(true);
      const result = await stakingContract.methods
        .claim({})
        .send({
          from: new Address(address),
          amount: new BigNumber(0.5).multipliedBy(10 ** 9).toString(),
          bounce: true,
        });
      if (result?.id?.lt && result?.endStatus === "active") {
        alert("Successfully claimed token!");
        setIsClaiming(false);
        await getStakingInfo();
      }
    } catch (e) {
      setIsClaiming(false);
      console.error(e);
    }
  }

  const depositTokens = async () => {
    if (!venomConnect || !address || !depositTokenAmount || !provider || !tokenWalletContract) return;
    const amount = new BigNumber(depositTokenAmount).multipliedBy(10 ** 9).toString(); // Contract"s rate parameter is 1 venom = 10 tokens
    try {
      setIsStaking(true);
      const result = await tokenWalletContract.methods
        .transfer({
          amount,
          recipient: stakingAddress,
          deployWalletValue: "0",
          remainingGasTo: address,
          notify: false,
          payload: null
        })
        .send({
          from: new Address(address),
          amount: new BigNumber(0.5).multipliedBy(10 ** 9).toString(),
          bounce: true,
        });
        if (result?.id?.lt && result?.endStatus === "active") {
        alert("Successfully deposited token!");
        setIsStaking(false);
        await getStakingInfo();
      }
    } catch (e) {
      setIsStaking(false);
      console.error(e);
    }
  };
  const transferOwner = async () => {
    if (!venomConnect || !address || !newOwner) return;
    try {
      setIsClaiming(true);
      const result = await stakingContract.methods
        .transferOwnership({newOwner:newOwner})
        .send({
          from: new Address(address),
          amount: new BigNumber(0.5).multipliedBy(10 ** 9).toString(),
          bounce: true,
        });
      if (result?.id?.lt && result?.endStatus === "active") {
        alert("Successfully transferred ownership!");
        setIsClaiming(false);
        await getStakingInfo();
      }
    } catch (e) {
      setIsClaiming(false);
      console.error(e);
    }
  };
  const withdrawTokens = async () => {
    if (!venomConnect || !address || !withdrawTokenAmount || !provider || !tokenWalletContract) return;
    const amount = new BigNumber(withdrawTokenAmount).multipliedBy(10 ** 9).toString(); // Contract"s rate parameter is 1 venom = 10 tokens
    try {
      setIsUnstaking(true);
      const result = await stakingContract.methods
        .withdraw({amount:amount})
        .send({
          from: new Address(address),
          amount: new BigNumber(0.5).multipliedBy(10 ** 9).toString(),
          bounce: true,
        });
      if (result?.id?.lt && result?.endStatus === "active") {
        alert("Successfully withdrawed token!");
        setIsUnstaking(false);
        await getStakingInfo();
      }
    } catch (e) {
      setIsUnstaking(false);
      console.error(e);
    }
  };
  return (
    <>
      <h1>Venompumpy Admin Panel</h1>
      <div className="tvl_apy">
        <div style={{textAlign:"center"}}>
          <b>Total number wallet address that staked </b><br />
          <b style={{fontSize: "25px"}}>{stakes?.length}</b>
        </div>
      </div>
      <div style={{marginTop: '20px'}}></div>
      <div className="tvl_apy">
        <div style={{textAlign:"center"}}>
          <b>Total number of NFTs staked </b><br />
          <b style={{fontSize: "25px"}}>{totalStakedNftCount}</b>
        </div>
      </div>
      <div style={{marginTop: '20px'}}></div>

      <div className="tvl_apy">
        <div style={{textAlign:"center"}}>
          <b>Total number of VenomPumpy Token staked </b><br />
          <b style={{fontSize: "25px"}}>{totalStakedAmount/10**9}</b>
        </div>
      </div>
      <div style={{marginTop: '20px'}}></div>
      
      <div className="number" style={{marginBottom:"20px"}}>
        <input
          type="number"
          min={0}
          value={depositTokenAmount !== undefined ? depositTokenAmount : ""}
          style={{textAlign: "right"}}
          placeholder="Enter amount to deposit"
          onChange={(e) => {
            onChangeDepositAmount(e.target.value);
          }}
        />
      </div>
      <a className={(!depositTokenAmount || isStaking ) ? "btn disabled" : "btn"} onClick={depositTokens} >
        Deposit
      </a>

      <div className="number" style={{marginTop:"20px", marginBottom:"20px"}}>
        <input
          type="number"
          min={0}
          value={withdrawTokenAmount !== undefined ? withdrawTokenAmount : ""}
          style={{textAlign: "right"}}
          placeholder="Enter amount to withdraw"
          onChange={(e) => {
            onChangeWithdrawAmount(e.target.value);
          }}
        />
      </div>
      <a className={!withdrawTokenAmount || isUnstaking ? "btn btn_unstake disabled" : "btn btn_unstake"} onClick={withdrawTokens}>
        Withdraw
      </a>

      <div className="number" style={{marginTop:"20px", marginBottom:"20px"}}>
        <input
          type="text"
          value={newOwner !== undefined ? newOwner : ""}
          style={{textAlign: "right"}}
          placeholder="Enter New Owner Address"
          onChange={(e) => {
            onChangeNewOwner(e.target.value);
          }}
        />
      </div>
      <div className="card__amount">
        <a className={isClaiming || newOwner==undefined ? "btn btn_claim disabled" : "btn btn_claim"} onClick={transferOwner}>
          Transfer Ownership
        </a>
      </div>
    </>
  );
}

export default StakingForm;
