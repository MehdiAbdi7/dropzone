import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

// Les hooks Redux typés une fois : useAppSelector connaît la forme du store.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
