import "dotenv/config"
import { getAccountNonce, createSmartAccountClient } from "permissionless"
import { UserOperation, bundlerActions, getSenderAddress, getUserOperationHash, waitForUserOperationReceipt, GetUserOperationReceiptReturnType, signUserOperationHashWithECDSA } from "permissionless"
import { pimlicoBundlerActions, pimlicoPaymasterActions } from "permissionless/actions/pimlico"
import { Address, Hash, concat, createClient, createPublicClient, encodeFunctionData, http, Hex } from "viem"
import { generatePrivateKey, privateKeyToAccount, signMessage } from "viem/accounts"
import { polygonMumbai, sepolia } from "viem/chains"
import { createPimlicoBundlerClient, createPimlicoPaymasterClient } from "permissionless/clients/pimlico";
import { privateKeyToSimpleSmartAccount, privateKeyToSafeSmartAccount } from "permissionless/accounts";
import { writeFileSync } from 'fs'

const privateKey = process.env.PRIVATE_KEY as Hex
const apiKey = process.env.PIMLICO_API_KEY
const chain = "sepolia" // find the list of chain names on the Pimlico verifying paymaster reference page

const RPC_URLS = {
  sepolia: "https://rpc.ankr.com/eth_sepolia",
}

const publicRPCUrl = RPC_URLS[chain]
const paymasterUrl = `https://api.pimlico.io/v2/${chain}/rpc?apikey=${apiKey}`
const bundlerUrl = `https://api.pimlico.io/v1/${chain}/rpc?apikey=${apiKey}`
const entrypointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"


// CREATE THE CLIENTS
const publicClient = createPublicClient({
  transport: http(publicRPCUrl),
  chain: sepolia
})
 

 
const bundlerClient = createClient({
  transport: http(bundlerUrl),
  chain: sepolia
}).extend(bundlerActions).extend(pimlicoBundlerActions)
 
const paymasterClient = createClient({
  // ⚠️ using v2 of the API ⚠️ 
  transport: http(paymasterUrl),
  chain: sepolia
}).extend(pimlicoPaymasterActions)
  
// GENERATE THE INITCODE
const SIMPLE_ACCOUNT_FACTORY_ADDRESS = "0x9406Cc6185a346906296840746125a0E44976454"
 

export const tutorial2 = async () => {
  console.log('------------------')
  console.log('Starting tutorial 2')
  const owner = privateKeyToAccount(privateKey)
  
  console.log('Generating initCode...')
  const initCode = concat([
    SIMPLE_ACCOUNT_FACTORY_ADDRESS,
    encodeFunctionData({
      abi: [{
        inputs: [{ name: "owner", type: "address" }, { name: "salt", type: "uint256" }],
        name: "createAccount",
        outputs: [{ name: "ret", type: "address" }],
        stateMutability: "nonpayable",
        type: "function",
      }],
      args: [owner.address, 0n]
    })
  ]);
  
  console.log("Generated initCode:", initCode)


  const senderAddress = await getSenderAddress(publicClient, {
    initCode,
    entryPoint: entrypointAddress,
  })
  console.log("Calculated sender address:", senderAddress)
  
  // GENERATE THE CALLDATA
  const to = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" // vitalik
  const value = 0n
  const data = "0x68656c6c6f" // "hello" encoded to utf-8 bytes
  
  const callData = encodeFunctionData({
    abi: [{
      inputs: [
        { name: "dest", type: "address" },
        { name: "value", type: "uint256" },
        { name: "func", type: "bytes" },
      ],
      name: "execute",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    }],
    args: [to, value, data]
  })
  
  console.log("Generated callData:", callData)

  // FILL OUT REMAINING USER OPERATION VALUES
  const gasPrice = await bundlerClient.getUserOperationGasPrice()

  const nonce = await getAccountNonce(publicClient, { sender: senderAddress, entryPoint: entrypointAddress })
  
  const userOperation = {
      sender: senderAddress,
      nonce,
      initCode: nonce === 0n ? initCode : '0x',
      callData,
      maxFeePerGas: gasPrice.fast.maxFeePerGas,
      maxPriorityFeePerGas: gasPrice.fast.maxPriorityFeePerGas,
      // dummy signature, needs to be there so the SimpleAccount doesn't immediately revert because of invalid signature length
      signature: "0xa15569dd8f8324dbeabf8073fdec36d4b754f53ce5901e283c6de79af177dc94557fa3c9922cd7af2a96ca94402d35c39f266925ee6407aeb32b31d76978d4ba1c" as Hex
  }

  // REQUEST PIMLICO VERIFYING PAYMASTER SPONSORSHIP
  const sponsorUserOperationResult = await paymasterClient.sponsorUserOperation({
    userOperation,
    entryPoint: entrypointAddress
  })
  
  const sponsoredUserOperation: UserOperation = {
    ...userOperation,
    preVerificationGas: sponsorUserOperationResult.preVerificationGas,
    verificationGasLimit: sponsorUserOperationResult.verificationGasLimit,
    callGasLimit: sponsorUserOperationResult.callGasLimit,
    paymasterAndData: sponsorUserOperationResult.paymasterAndData
  }
  
  console.log("Received paymaster sponsor result:", sponsorUserOperationResult)
  // SIGN THE USER OPERATION
  const signature = await signUserOperationHashWithECDSA({
    account: owner,
    userOperation: sponsoredUserOperation,
    chainId: sepolia.id,
    entryPoint: entrypointAddress
  })
  sponsoredUserOperation.signature = signature
  
  console.log("Generated signature:", signature)

  // SUBMIT THE USER OPERATION TO BE BUNDLED
  const userOperationHash = await bundlerClient.sendUserOperation({
    userOperation: sponsoredUserOperation,
    entryPoint: entrypointAddress
  })
  
  console.log("Received User Operation hash:", userOperationHash)
  
  // let's also wait for the userOperation to be included, by continually querying for the receipts
  console.log("Querying for receipts...")
  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOperationHash })
  const txHash = receipt.receipt.transactionHash
  
  console.log(`UserOperation included: https://goerli.lineascan.build/tx/${txHash}`)


  console.log('------------------') 
}