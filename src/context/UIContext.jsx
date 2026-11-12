import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";
import { formatDateTime } from "../utils/format.js";
import Modal from "../components/Modal.jsx";
import { useAuth } from "./AuthContext.jsx";
import { useToast } from "./ToastContext.jsx";

const UIContext = createContext(null);

const EMPTY_QR = { open: false, transactionId: null, itemName: "", data: null, loading: false };
const EMPTY_SCAN = { open: false, token: "", error: "", busy: false, cameraOn: false, cameraError: "" };

export function UIProvider({ children }) {
  const { toast } = useToast();
  const { refreshUnread } = useAuth();

  const [confirmState, setConfirmState] = useState(null);
  const [qr, setQr] = useState(EMPTY_QR);
  const [scan, setScan] = useState(EMPTY_SCAN);

  const confirmResolver = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanLoopRef = useRef(null);
  const videoRef = useRef(null);

  /* ---------------- Confirmation dialog ---------------- */

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      confirmResolver.current = resolve;
      setConfirmState({ ...options });
    });
  }, []);

  const closeConfirm = useCallback((result) => {
    if (confirmResolver.current) {
      confirmResolver.current(result);
      confirmResolver.current = null;
    }
    setConfirmState(null);
  }, []);

  /* ---------------- QR handover ---------------- */

  const loadQr = useCallback(
    async (transactionId) => {
      setQr((current) => ({ ...current, loading: true, data: null }));
      try {
        const data = await api.get("/api/transactions/" + transactionId + "/qr");
        setQr((current) => ({ ...current, loading: false, data }));
      } catch (error) {
        setQr((current) => ({ ...current, loading: false }));
        toast(error.message || "Could not generate the QR code.", "danger");
        setQr(EMPTY_QR);
      }
    },
    [toast]
  );

  const openQr = useCallback(
    (transactionId, itemName) => {
      setQr({ open: true, transactionId, itemName: itemName || "", data: null, loading: true });
      loadQr(transactionId);
    },
    [loadQr]
  );

  const refreshQr = useCallback(() => {
    if (qr.transactionId) loadQr(qr.transactionId);
  }, [qr.transactionId, loadQr]);

  const copyToken = useCallback(async () => {
    if (!qr.data) return;
    try {
      await navigator.clipboard.writeText(qr.data.token);
      toast("Token copied to clipboard.", "success");
    } catch {
      toast("Could not copy automatically — select and copy the token manually.", "warning");
    }
  }, [qr.data, toast]);

  /* ---------------- Scan handover ---------------- */

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      window.clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScan((current) => ({ ...current, cameraOn: false }));
  }, []);

  const openScan = useCallback(() => {
    setScan({ ...EMPTY_SCAN, open: true });
  }, []);

  const closeScan = useCallback(() => {
    stopCamera();
    setScan({ ...EMPTY_SCAN });
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setScan((current) => ({ ...current, cameraError: "" }));
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScan((current) => ({
        ...current,
        cameraError: "Camera access is not available in this browser. Paste the token instead."
      }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScan((current) => ({ ...current, cameraOn: true }));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (typeof window.BarcodeDetector === "undefined") {
        setScan((current) => ({
          ...current,
          cameraError:
            "Live scanning isn't supported in this browser. Point the camera at the code, or paste the token."
        }));
        return;
      }
      detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
      scanLoopRef.current = window.setInterval(async () => {
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            setScan((current) => ({ ...current, token: codes[0].rawValue }));
            stopCamera();
            toast("QR detected. Tap confirm handover.", "success");
          }
        } catch {
          // Ignore transient detection errors.
        }
      }, 700);
    } catch {
      setScan((current) => ({
        ...current,
        cameraError: "Camera permission was denied or no camera is available. Paste the token instead."
      }));
    }
  }, [stopCamera, toast]);

  const confirmScan = useCallback(async () => {
    const token = scan.token.trim();
    if (!token) {
      setScan((current) => ({ ...current, error: "Paste the token or scan the QR code first." }));
      return;
    }
    setScan((current) => ({ ...current, busy: true, error: "" }));
    try {
      const transaction = await api.post("/api/transactions/scan", { token });
      stopCamera();
      setScan({ ...EMPTY_SCAN });
      toast('Handover confirmed for "' + transaction.item.itemName + '".', "success");
      window.dispatchEvent(new CustomEvent("bb:transactions-changed"));
    } catch (error) {
      setScan((current) => ({
        ...current,
        busy: false,
        error: error.message || "That QR code is not valid."
      }));
    }
  }, [scan.token, stopCamera, toast]);

  const confirmReturn = useCallback(
    async (transactionId, itemName, onDone) => {
      const confirmed = await confirm({
        title: "Confirm return",
        message:
          'Mark "' +
          (itemName || "this item") +
          '" as returned? The owner will be notified and both of you can leave a review.',
        confirmText: "Yes, it's returned",
        cancelText: "Not yet"
      });
      if (!confirmed) return;
      try {
        await api.put("/api/transactions/" + transactionId + "/return");
        toast("Return confirmed. Thanks for returning it!", "success");
        window.dispatchEvent(new CustomEvent("bb:transactions-changed"));
        if (onDone) onDone();
        refreshUnread();
      } catch (error) {
        toast(error.message || "Could not confirm the return.", "danger");
      }
    },
    [confirm, refreshUnread, toast]
  );

  useEffect(() => {
    return () => {
      if (scanLoopRef.current) window.clearInterval(scanLoopRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const value = { confirm, openQr, openScan, confirmReturn };

  return (
    <UIContext.Provider value={value}>
      {children}

      <Modal
        show={Boolean(confirmState)}
        onClose={() => closeConfirm(false)}
        title={confirmState?.title || "Are you sure?"}
        footer={
          <>
            <button className="btn btn-bb-outline" type="button" onClick={() => closeConfirm(false)}>
              {confirmState?.cancelText || "Cancel"}
            </button>
            <button
              className={"btn " + (confirmState?.danger ? "btn-bb-danger-soft" : "btn-bb-primary")}
              type="button"
              onClick={() => closeConfirm(true)}
            >
              {confirmState?.confirmText || "Confirm"}
            </button>
          </>
        }
      >
        <p className="text-muted-2 mb-0">{confirmState?.message}</p>
      </Modal>

      <Modal
        show={qr.open}
        onClose={() => setQr(EMPTY_QR)}
        title="Handover QR code"
        icon="bi-qr-code"
        footer={
          <button className="btn btn-bb-outline" type="button" onClick={() => setQr(EMPTY_QR)}>
            Close
          </button>
        }
      >
        <div className="text-center">
          <p className="text-muted-2 mb-1" style={{ fontSize: ".86rem" }}>
            Show this code to the borrower at handover.
          </p>
          <div className="fw-bold mb-3">{qr.itemName}</div>
          {qr.loading || !qr.data ? (
            <div className="spinner-wrap">
              <span className="spinner-border spinner-border-sm" role="status" />
              <span>Generating QR code…</span>
            </div>
          ) : (
            <>
              <img className="qr-image mb-3" src={qr.data.imageDataUrl} alt="Handover QR code" />
              <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                <span className="pill pill-warning">
                  <i className="bi bi-clock" /> Expires {formatDateTime(qr.data.expiresAt)}
                </span>
                <span className="pill pill-teal">
                  <i className="bi bi-shield-check" /> Single use
                </span>
              </div>
              <div className="text-start">
                <div className="small-caps mb-1">Manual token</div>
                <div className="token-box mb-2">{qr.data.token}</div>
                <button className="btn btn-bb-outline btn-sm" type="button" onClick={copyToken}>
                  <i className="bi bi-clipboard me-1" />Copy token
                </button>{" "}
                <button className="btn btn-bb-soft btn-sm" type="button" onClick={refreshQr}>
                  <i className="bi bi-arrow-clockwise me-1" />Generate new code
                </button>
              </div>
              <div className="alert alert-warning mt-3 mb-0 text-start py-2" style={{ fontSize: ".8rem" }}>
                <i className="bi bi-info-circle me-1" />
                Generating a new code invalidates the previous one. The code stops working after the
                reservation return date.
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        show={scan.open}
        onClose={closeScan}
        title="Scan handover QR"
        icon="bi-qr-code-scan"
        footer={
          <>
            <button className="btn btn-bb-outline" type="button" onClick={closeScan}>
              Cancel
            </button>
            <button className="btn btn-bb-primary" type="button" onClick={confirmScan} disabled={scan.busy}>
              {scan.busy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Confirming…
                </>
              ) : (
                "Confirm handover"
              )}
            </button>
          </>
        }
      >
        <p className="text-muted-2" style={{ fontSize: ".88rem" }}>
          Point your camera at the owner's QR code, or paste the token shown under it.
        </p>
        {scan.cameraOn && (
          <div className="ratio ratio-4x3 bg-dark rounded-3 overflow-hidden mb-3">
            <video ref={videoRef} playsInline muted />
          </div>
        )}
        <div className="d-flex gap-2 mb-3">
          {!scan.cameraOn ? (
            <button className="btn btn-bb-outline btn-sm" type="button" onClick={startCamera}>
              <i className="bi bi-camera-video me-1" />Use camera
            </button>
          ) : (
            <button className="btn btn-bb-outline btn-sm" type="button" onClick={stopCamera}>
              Stop camera
            </button>
          )}
        </div>
        <label className="form-label" htmlFor="scanToken">
          Handover token
        </label>
        <input
          className="form-control mb-2"
          id="scanToken"
          placeholder="Paste the QR token here"
          autoComplete="off"
          value={scan.token}
          onChange={(event) => setScan((current) => ({ ...current, token: event.target.value, error: "" }))}
        />
        {scan.cameraError && (
          <div className="alert alert-warning py-2 mb-2" role="alert">
            {scan.cameraError}
          </div>
        )}
        {scan.error && (
          <div className="alert alert-danger py-2 mb-0" role="alert">
            {scan.error}
          </div>
        )}
      </Modal>
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used inside UIProvider");
  return context;
}
