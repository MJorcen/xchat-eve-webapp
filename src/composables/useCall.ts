import { reactive } from "vue";
import type { Anchor } from "../types/eve";

const state = reactive<{ target: Anchor | null }>({
  target: null
});

export function useCall() {
  function openCall(anchor: Anchor) {
    state.target = anchor;
  }

  function closeCall() {
    state.target = null;
  }

  return {
    callState: state,
    openCall,
    closeCall
  };
}
