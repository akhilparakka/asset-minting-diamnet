import React, { useState } from "react";
import { create } from "ipfs-http-client";
import { Buffer } from "buffer";
import "./App.css";
import {
  Asset,
  Aurora,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "diamnet-sdk";
import { auroraServerUrl, masterSecret } from "../constants/constants";
import Loader from "./Loader/Loader";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [webVisible, setWebVisible] = useState(false);
  const [officeVisible, setOfficeVisible] = useState(false);
  const [webReverse, setWebReverse] = useState(false);
  const [officeReverse, setOfficeReverse] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [contentVisible, setContentVisible] = useState(false);
  const [file, setFile] = useState("");
  const [assetName, setAssetName] = useState("");
  const [loading, setLoading] = useState(false);
  const [nftData, setNftData] = useState([]);

  const notify = (message) => {
    toast.error(message, {
      position: "top-right",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      progress: undefined,
      theme: "dark",
    });
  };

  const handleWebClick = async () => {
    if (!userAddress) {
      const connectionResp = await window.diam.connect();
      setUserAddress(connectionResp.message[0].diamPublicKey);
      setWebVisible(true);
      setOfficeVisible(false);
      setWebReverse(false);
    } else {
      setWebVisible(true);
      setOfficeVisible(false);
      setWebReverse(false);
    }

    setTimeout(() => {
      setContentVisible(true);
    }, 600);
  };

  const handleOfficeClick = async () => {
    if (!userAddress) {
      const connectionResp = await window.diam.connect();
      setUserAddress(connectionResp.message[0].diamPublicKey);
      setOfficeVisible(true);
      setWebVisible(false);
      setOfficeReverse(false);
      handleNftSectionOpen(connectionResp.message[0].diamPublicKey);

      setTimeout(() => {
        setContentVisible(true);
      }, 600);
    } else {
      setOfficeVisible(true);
      setWebVisible(false);
      setOfficeReverse(false);
      handleNftSectionOpen(userAddress);

      setTimeout(() => {
        setContentVisible(true);
      }, 600);
    }
  };

  const handleWebBackClick = () => {
    setContentVisible(false);
    setWebReverse(true);
    setTimeout(() => {
      setWebVisible(false);
      setWebReverse(false);
    }, 600);
  };

  const handleOfficeBackClick = () => {
    setContentVisible(false);
    setOfficeReverse(true);
    setTimeout(() => {
      setOfficeVisible(false);
      setOfficeReverse(false);
    }, 600);
  };

  const handleImageSelect = (event) => {
    setFile(event.target.files[0]);
  };

  const handleAssetNameChange = (event) => {
    const inputAsset = event.target.value.replace(/[^a-zA-Z0-9]/g, "");
    if (inputAsset.length <= 12) {
      setAssetName(inputAsset);
    }
  };

  const handleSubmit = async () => {
    if (file) {
      setLoading(true);
      const masterKeypair = Keypair.fromSecret(masterSecret);
      const issuerKeypair = Keypair.random();
      const server = new Aurora.Server(auroraServerUrl);

      const masterAccount = await server.loadAccount(masterKeypair.publicKey());

      try {
        const ipfsClient = create({
          url: "https://uploadipfs.diamcircle.io",
        });
        const ipfsResult = await ipfsClient.add(file);
        const asset = new Asset(assetName, issuerKeypair.publicKey());

        const tx = new TransactionBuilder(masterAccount, {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(
            Operation.createAccount({
              destination: issuerKeypair.publicKey(),
              startingBalance: "2",
            })
          )
          .addOperation(
            Operation.changeTrust({
              asset: asset,
              source: userAddress,
            })
          )
          .addOperation(
            Operation.manageData({
              name: assetName,
              source: userAddress,
              value: ipfsResult.path,
            })
          )
          .addOperation(
            Operation.payment({
              destination: userAddress,
              source: issuerKeypair.publicKey(),
              asset: asset,
              amount: "0.0000001",
            })
          )
          .addOperation(
            Operation.setOptions({
              source: issuerKeypair.publicKey(),
              masterWeight: 0,
            })
          )
          .setTimeout(0)
          .build();

        tx.sign(masterKeypair, issuerKeypair);

        const xdr = tx.toXDR();
        const signResponse = await window.diam.sign(
          xdr,
          true,
          Networks.TESTNET
        );

        if (signResponse.response.status === 200) {
          toast.success("Transaction Successful", {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
          });
          setWebVisible(false);
          setOfficeVisible(true);
          setWebReverse(false);
          setOfficeReverse(false);
          setContentVisible(true);
          handleNftSectionOpen(userAddress);
        } else {
          console.log(signResponse);
          notify("Transaction Failed");
        }
      } catch (e) {
        notify("Transaction Failed");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNftSectionOpen = async (userAddr) => {
    const server = new Aurora.Server(auroraServerUrl);
    const userAccount = await server.loadAccount(userAddr);
    setNftData(userAccount.data_attr);
  };

  return (
    <div className="App">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        theme="dark"
      />
      <div
        className={`back-web ${webVisible ? "visible" : ""}`}
        onClick={handleWebBackClick}
        style={{ display: webVisible && !webReverse ? "block" : "none" }}
      >
        BACK
      </div>
      <div
        className={`back-office ${officeVisible ? "visible" : ""}`}
        onClick={handleOfficeBackClick}
        style={{ display: officeVisible && !officeReverse ? "block" : "none" }}
      >
        BACK
      </div>

      <div
        className={`web-title ${webVisible ? "expanded" : ""} ${
          webReverse ? "reverse" : ""
        }`}
        onClick={handleWebClick}
      >
        <h1>Mint</h1>
        <div
          className={`address_box ${webVisible ? "visible" : ""}`}
          style={{ display: webVisible && !webReverse ? "block" : "none" }}
        >
          {`${userAddress?.slice(0, 6)}...${userAddress?.slice(-6)}`}
        </div>
      </div>

      <div
        className={`office-title ${officeVisible ? "expanded" : ""} ${
          officeReverse ? "reverse" : ""
        }`}
        onClick={handleOfficeClick}
      >
        <h1>My NFTs</h1>
      </div>

      <div className={`home_content ${webVisible ? "visible" : ""}`}>
        <div className={`home_content_box ${contentVisible ? "visible" : ""}`}>
          <div className="image_upload_container">
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              className="image_upload"
              onChange={handleImageSelect}
            />
            <label className="image_upload_label" htmlFor="fileInput">
              {file?.name || "Upload Image"}
            </label>
          </div>
          <input
            type="text"
            className="asset_name_input"
            placeholder="Asset Name"
            value={assetName}
            onChange={handleAssetNameChange}
          />
          <button
            className="submit_button"
            onClick={handleSubmit}
            disabled={!file || !assetName}
          >
            Mint
          </button>
        </div>
        {loading && (
          <div className="loader-overlay">
            <Loader />
          </div>
        )}
      </div>

      <div className={`office-content ${officeVisible ? "visible" : ""}`}>
        <div className={`nfts_content_box ${contentVisible ? "visible" : ""}`}>
          {nftData && <NftGallery nftData={nftData} />}
        </div>
      </div>
    </div>
  );
}

const NftGallery = ({ nftData }) => {
  return (
    <div className="nft_box">
      {Object.entries(nftData).map(([key, value]) => {
        const decodedValue = Buffer.from(value, "base64").toString("utf8");
        return (
          <div className="card" key={key}>
            <img
              src={`https://browseipfs.diamcircle.io/ipfs/${decodedValue}`}
              alt={key}
              className="card_image"
            />
            <div className="card_name">{key}</div>
          </div>
        );
      })}
    </div>
  );
};
export default App;
