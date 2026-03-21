import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface FacultyResponse {
  id: string;
  name: string;
  isActive: boolean;
  departments?: { id: string; name: string; isActive: boolean }[];
}

/**
 * Fetches faculties + departments from the API and returns a
 * Record<string, string[]> map (faculty name → department names).
 * Only includes active faculties and departments.
 */
export function useFaculties() {
  const [facultyDepartments, setFacultyDepartments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<FacultyResponse[]>("/admin/faculties").then((res) => {
      if (res.success && Array.isArray(res.data)) {
        const map: Record<string, string[]> = {};
        for (const f of res.data) {
          if (!f.isActive) continue;
          map[f.name] = (f.departments ?? [])
            .filter((d) => d.isActive)
            .map((d) => d.name);
        }
        setFacultyDepartments(map);
      }
      setLoading(false);
    });
  }, []);

  return { facultyDepartments, loading };
}
