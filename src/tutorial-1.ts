import "dotenv/config"
import { getAccountNonce, createSmartAccountClient } from "permissionless"
import { UserOperation, bundlerActions, getSenderAddress, getUserOperationHash, waitForUserOperationReceipt, GetUserOperationReceiptReturnType, signUserOperationHashWithECDSA } from "permissionless"
import { pimlicoBundlerActions, pimlicoPaymasterActions } from "permissionless/actions/pimlico"
import { Address, Hash, concat, createClient, createPublicClient, encodeFunctionData, http, Hex } from "viem"
import { generatePrivateKey, privateKeyToAccount, signMessage } from "viem/accounts"
import { lineaTestnet, polygonMumbai, sepolia } from "viem/chains"
import { createPimlicoBundlerClient, createPimlicoPaymasterClient } from "permissionless/clients/pimlico";
import { privateKeyToSimpleSmartAccount, privateKeyToSafeSmartAccount } from "permissionless/accounts";
import { writeFileSync } from 'fs'

const privateKey = process.env.PRIVATE_KEY as Hex
const apiKey = process.env.PIMLICO_API_KEY

const publicRPCUrl = "https://rpc.ankr.com/eth_sepolia"
const paymasterUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${apiKey}`
const entrypointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
const bundlerUrl = `https://api.pimlico.io/v1/sepolia/rpc?apikey=${apiKey}`


// Setup Clients
export const publicClient = createPublicClient({
transport: http(publicRPCUrl),
})

export const paymasterClient = createPimlicoPaymasterClient({
transport: http(paymasterUrl),
})

export const bundlerClient = createClient({
transport:  http(`https://api.pimlico.io/v1/sepolia/rpc?apikey=${apiKey}`),
chain: sepolia
}).extend(bundlerActions).extend(pimlicoBundlerActions)
 

export const tutorial1 = async () => {
  console.log('------------------')
  console.log('Starting tutorial 1')
  console.log('Should generate a smart account and send a transaction to vitalik')

  console.log('Generating smart account address...')
  // Create a smart account
  const account = await privateKeyToSafeSmartAccount(publicClient, {
    privateKey,
    safeVersion: "1.4.1", // simple version
    entryPoint: entrypointAddress, // global entrypoint
  })
   
  console.log(`Smart account address: https://sepolia.etherscan.io/address/${account.address}`)
  
  // Create a smart account client
  const smartAccountClient = createSmartAccountClient({
    account,
    chain: sepolia,
    transport: http(bundlerUrl),
    sponsorUserOperation: paymasterClient.sponsorUserOperation,
  }).extend(bundlerActions).extend(pimlicoBundlerActions)
   
  console.log('Fetching gas prices...')
  // Fetch gas prices and send an empty transaction
  const gasPrices = await smartAccountClient.getUserOperationGasPrice()
  console.log('Gas prices:', gasPrices)
  
  console.log('Sending transaction to vitalik...')
  const txHash = await smartAccountClient.sendTransaction({
    to: "0x13302Eb0aD9Af2F847119dC4Ac632fFe196d0B0f",
    value: 0n,
    data: "0x1234",
    maxFeePerGas: gasPrices.fast.maxFeePerGas,
    maxPriorityFeePerGas: gasPrices.fast.maxPriorityFeePerGas,
  })
   
  console.log(`User operation included: https://sepolia.etherscan.io/tx/${txHash}`)
  console.log('Tutorial 1 complete')
  console.log('------------------')
}
