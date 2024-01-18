import "dotenv/config"
import { getAccountNonce, createSmartAccountClient, BundlerClient, signUserOperationHashWithECDSA, BundlerActions } from "permissionless"
import { UserOperation, bundlerActions, } from "permissionless"
import { PimlicoBundlerActions, pimlicoBundlerActions } from "permissionless/actions/pimlico"
import { Address, createClient, createPublicClient, http, Hex, PublicClient } from "viem"
import { PimlicoPaymasterClient, createPimlicoPaymasterClient } from "permissionless/clients/pimlico";
import {privateKeyToSafeSmartAccount } from "permissionless/accounts";

import { publicRPCUrl, paymasterUrl, Chain, bundlerUrl, ENTRYPOINT_ADDRESSES, USDC_ADDRESSES, PAYMASTER_ADDRESSES } from "./constants"
import { approveUSDCSpendCallData } from './utils'
import { privateKeyToAccount } from "viem/accounts"

const apiKey = process.env.PIMLICO_API_KEY as Hex


type SmartAccountOptions = {
  chain: Chain
  privateKey: Hex
}

export default class SmartAccount {
  private chain: Chain
  private privateKey: Hex
  private publicClient: PublicClient
  private paymasterClient: PimlicoPaymasterClient
  private bundlerClient: BundlerClient & BundlerActions & PimlicoBundlerActions

  constructor({ chain, privateKey }: SmartAccountOptions) {
    console.log('SmartAccount constructor')
    this.chain = chain
    this.privateKey = privateKey
    this.publicClient = createPublicClient({
      transport: http(publicRPCUrl({ chain })),
    })
      
    this.paymasterClient = createPimlicoPaymasterClient({
      transport: http(paymasterUrl({ chain, apiKey })),
    })
      
    this.bundlerClient = createClient({
      transport:  http(bundlerUrl({ chain, apiKey })),
      chain,
    }).extend(bundlerActions).extend(pimlicoBundlerActions)
  }

  private getSmartAccountClient = async () => {
    const account = await this.getAccount()
    return createSmartAccountClient({
      account,
      chain: this.chain,
      transport: http(bundlerUrl({ chain: this.chain, apiKey })),
      sponsorUserOperation: this.paymasterClient.sponsorUserOperation,
    }).extend(bundlerActions).extend(pimlicoBundlerActions)
  }

  public getAccount = async () =>
    privateKeyToSafeSmartAccount(this.publicClient, {
      privateKey: this.privateKey,
      safeVersion: "1.4.1", // simple version
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name], // global entrypoint
      setupTransactions: [{
        to: USDC_ADDRESSES[this.chain.name],
        value: 0n,
        data: approveUSDCSpendCallData({
          to: PAYMASTER_ADDRESSES[this.chain.name],
          amount: 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn,
        }),
      }]
    })
  
  public getNonce = async () => {
    const smartAccountClient = await this.getSmartAccountClient()
    return getAccountNonce(this.publicClient, {
      sender: smartAccountClient.account.address as Hex,
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name],
    })
  }

  public sendTransaction = async ({ to, value, data }: { to: Address, value: bigint, data: Hex }) => {
    const smartAccountClient = await this.getSmartAccountClient()
    const gasPrices = await smartAccountClient.getUserOperationGasPrice()
    
    return smartAccountClient.sendTransaction({
      to,
      value,
      data,
      maxFeePerGas: gasPrices.fast.maxFeePerGas,
      maxPriorityFeePerGas: gasPrices.fast.maxPriorityFeePerGas,
    })
  }

  // This is somehow failing with AA23 error :thinking:
  public sendUserOperation = async ({ callData, paymasterAndData }: { callData: Hex, paymasterAndData?: Hex }) => {
    const account = await this.getAccount()
    const gasPrices = await this.bundlerClient.getUserOperationGasPrice()
    const nonce = await this.getNonce()
    const userOperation: Partial<UserOperation> = {
        sender: account.address as Hex,
        nonce,
        initCode: '0x',
        callData,
        maxFeePerGas: gasPrices.fast.maxFeePerGas,
        maxPriorityFeePerGas: gasPrices.fast.maxPriorityFeePerGas,
        callGasLimit: 100_000n, // hardcode it for now at a high value
        verificationGasLimit: 500_000n, // hardcode it for now at a high value
        preVerificationGas: 50_000n, // hardcode it for now at a high value
        paymasterAndData,
        signature: "0x"
    }

    const result = await this.paymasterClient.sponsorUserOperation({
      userOperation: userOperation as UserOperation,
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name]
    })

    userOperation.preVerificationGas = result.preVerificationGas
    userOperation.verificationGasLimit = result.verificationGasLimit
    userOperation.callGasLimit = result.callGasLimit
    userOperation.paymasterAndData = result.paymasterAndData

    console.log('Signing user operation...')
    userOperation.signature = await signUserOperationHashWithECDSA({
      account: privateKeyToAccount(this.privateKey),
      userOperation: userOperation as UserOperation,
      chainId: this.chain.id,
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name],
    })
    console.log('Sending user operation...')
    const userOperationHash = await this.bundlerClient.sendUserOperation({
      userOperation: userOperation as UserOperation,
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name],
    })
    console.log(`UserOperation submitted. Hash: ${userOperationHash}`)

    console.log("Querying for receipts...")
    const receipt = await this.bundlerClient.waitForUserOperationReceipt({
      hash: userOperationHash
    })
    console.log(`Receipt found!\nTransaction hash: ${receipt.receipt.transactionHash}`)
  }
}