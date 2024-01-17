import "dotenv/config"
import { getAccountNonce, createSmartAccountClient, BundlerClient, SmartAccountClient } from "permissionless"
import { UserOperation, bundlerActions, getSenderAddress, getUserOperationHash, waitForUserOperationReceipt, GetUserOperationReceiptReturnType, signUserOperationHashWithECDSA } from "permissionless"
import { pimlicoBundlerActions, pimlicoPaymasterActions } from "permissionless/actions/pimlico"
import { Address, Hash, concat, createClient, createPublicClient, encodeFunctionData, http, Hex, PublicClient } from "viem"
import { generatePrivateKey, privateKeyToAccount, signMessage } from "viem/accounts"
import { lineaTestnet, polygonMumbai, sepolia } from "viem/chains"
import { PimlicoPaymasterClient, createPimlicoBundlerClient, createPimlicoPaymasterClient } from "permissionless/clients/pimlico";
import { privateKeyToSimpleSmartAccount, privateKeyToSafeSmartAccount } from "permissionless/accounts";
import { writeFileSync } from 'fs'

import { publicRPCUrl, paymasterUrl, Chain, bundlerUrl, ENTRYPOINT_ADDRESSES } from "./constants"

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
  private bundlerClient: BundlerClient

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
      chain: sepolia
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
    })

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

  public getNonce = async () => {
    const smartAccountClient = await this.getSmartAccountClient()
    return getAccountNonce(this.publicClient, {
      sender: smartAccountClient.account.address as Hex,
      entryPoint: ENTRYPOINT_ADDRESSES[this.chain.name],
    })
  }
}