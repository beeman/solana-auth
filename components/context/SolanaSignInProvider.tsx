import { useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import dynamic from "next/dynamic";
import { FC, ReactNode, useCallback, useState } from "react";
import { signInMessage } from "../../config";
import { firebaseClient } from "../../utils/firebaseClient";
import { SolanaAuthContext, SolanaAuthState } from "./useSolanaSignIn";

export interface SolanaSignInProviderProps {
  requestUrl: string;
  callbackUrl: string;
  domain: string;
  children: ReactNode;
  onAuthCallback(data: Record<string, string>): Promise<any>;
}
export const SolanaSignInProvider: FC<SolanaSignInProviderProps> = ({
  children,
  requestUrl,
  callbackUrl,
  domain,
  onAuthCallback,
}) => {
  const { publicKey, signMessage } = useWallet();
  const [isAuthenticated, setAuthed] = useState<boolean>(false);
  const [data, setData] = useState<Record<string, string>>({});

  const authenticate = useCallback(async () => {
    try {
      const { nonce } = await fetch(`${requestUrl}?pubkey=${publicKey}`)
        .then((resp) => resp.json())
        .then((data) => data);

      if (!signMessage) throw new Error("Wallet does not support signing");

      // TODO: Abstract into user defined message
      // construct the message
      const message = signInMessage(nonce, domain);
      // encode the message
      const encodedMsg = new TextEncoder().encode(message);
      // sign with the wallet
      const signature = await signMessage(encodedMsg);

      // complete the authorization

      let callbackData = await fetch(
        callbackUrl +
          "?" +
          new URLSearchParams({
            pubkey: publicKey!.toString(),
            payload: message,
            signature: Array.from(signature).toString(),
          })
      ).then((resp) => resp.json());

      if (!callbackData) throw new Error("No data received from callback");

      // TODO: Abstract to user defined parameter
      const data = await onAuthCallback(callbackData);
      setData(data);
      setAuthed(true);
      console.log("completed signin!");
    } catch (error: any) {
      alert(`Signing failed: ${error?.message}`);
    }
  }, [callbackUrl, domain, onAuthCallback, publicKey, requestUrl, signMessage]);

  return (
    <SolanaAuthContext.Provider
      value={{
        isAuthenticated,
        authenticate,
        data,
        publicKey,
      }}
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </SolanaAuthContext.Provider>
  );
};
