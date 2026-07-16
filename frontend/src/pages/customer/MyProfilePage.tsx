import { useEffect, useState } from "react";
import { customerApi } from "../../api/customer.api";
import type { Customer } from "../../api/types";

export function MyProfilePage() {
  const [profile, setProfile] = useState<Customer | null>(null);

  useEffect(() => {
    customerApi.myProfile().then(setProfile);
  }, []);

  if (!profile) {
    return <p className="text-gray-400">Loading...</p>;
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-2 text-sm">
        <p>
          <span className="text-gray-500">Name:</span> {profile.name}
        </p>
        <p>
          <span className="text-gray-500">Phone:</span> {profile.phone}
        </p>
        <p>
          <span className="text-gray-500">Address:</span> {profile.address}
        </p>
        {profile.villageArea && (
          <p>
            <span className="text-gray-500">Village/Area:</span> {profile.villageArea}
          </p>
        )}
      </div>
    </div>
  );
}
