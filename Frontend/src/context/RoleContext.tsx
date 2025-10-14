import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role = "authority" | "user";

type RoleContextType = {
  role: Role;
  setRole: (r: Role) => void;
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  // default to 'user' for safer permissions; can be switched in UI
  const [role, setRole] = useState<Role>(
    (localStorage.getItem("trishul_role") as Role) || "user"
  );

  const setRoleAndPersist = (r: Role) => {
    setRole(r);
    try {
      localStorage.setItem("trishul_role", r);
    } catch (e) {
      // ignore storage errors
    }
  };

  return (
    <RoleContext.Provider value={{ role, setRole: setRoleAndPersist }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
};

export default RoleContext;
