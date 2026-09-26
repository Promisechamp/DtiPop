import React, { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import Modal from "@/reusables/Modal";
import Select from "@/reusables/Select";
import {
  GetCountries,
  GetState,
  GetCity,
} from "react-country-state-city";

import { useAuth } from "@/context/AuthContext";

const emptyLocation = {
  country: "",
  country_code: "",
  state: "",
  state_code: "",
  city: "",
  postal_code: "",
  latitude: null,
  longitude: null,
  source: "manual",
};

const normalize = (value) => String(value || "").trim();

const getInitialLocation = (profile) => {
  const location = profile?.location;

  if (
    !location ||
    typeof location !== "object" ||
    Array.isArray(location)
  ) {
    return emptyLocation;
  }

  return {
    ...emptyLocation,
    ...location,
    country: normalize(location.country),
    country_code: normalize(location.country_code),
    state: normalize(location.state),
    state_code: normalize(location.state_code),
    city: normalize(location.city),
    postal_code: normalize(location.postal_code),
  };
};

const getCountryName = (country) =>
  country?.name ||
  country?.country_name ||
  country?.label ||
  "";

const getCountryCode = (country) =>
  country?.iso2 ||
  country?.isoCode ||
  country?.iso_code ||
  country?.countryCode ||
  country?.code ||
  "";

const getStateName = (state) =>
  state?.name ||
  state?.state_name ||
  state?.label ||
  "";

const getStateCode = (state) =>
  state?.iso2 ||
  state?.isoCode ||
  state?.iso_code ||
  state?.state_code ||
  state?.code ||
  "";

const getCityName = (city) =>
  city?.name ||
  city?.city_name ||
  city?.label ||
  "";

const getFlagEmoji = (countryCode) => {
  const code = normalize(countryCode).toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    return "🌍";
  }

  return [...code]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
};

const LocationModal = ({ open, onClose }) => {
  const { profile, updateLocation } = useAuth();

  const [formData, setFormData] = useState(() =>
    getInitialLocation(profile)
  );

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addingState, setAddingState] = useState(false);
  const [addingCity, setAddingCity] = useState(false);

  const [customState, setCustomState] = useState("");
  const [customCity, setCustomCity] = useState("");

  /**
   * Keep the form synchronized when the profile changes.
   */
  useEffect(() => {
    if (!open) return;

    setFormData(getInitialLocation(profile));
    setAddingState(false);
    setAddingCity(false);
    setCustomState("");
    setCustomCity("");
  }, [open, profile]);

  /**
   * Load countries.
   */
  useEffect(() => {
    let cancelled = false;

    const loadCountries = async () => {
      setLoadingCountries(true);

      try {
        const result = await GetCountries();

        if (!cancelled) {
          setCountries(Array.isArray(result) ? result : []);
        }
      } catch (error) {
        console.error("Failed to load countries:", error);

        if (!cancelled) {
          toast.error("Unable to load countries.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCountries(false);
        }
      }
    };

    loadCountries();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Country options for the custom Select.
   */
  const countryOptions = useMemo(() => {
    return countries
      .map((country) => {
        const name = getCountryName(country);
        const code = getCountryCode(country);

        if (!name) return null;

        return {
          value: code || name,
          label: name,
          description: code ? code.toUpperCase() : "",
          icon: getFlagEmoji(code),
        };
      })
      .filter(Boolean);
  }, [countries]);

  /**
   * Find the actual country object from the selected value.
   */
  const selectedCountry = useMemo(() => {
    if (!formData.country && !formData.country_code) {
      return null;
    }

    return (
      countries.find((country) => {
        const name = getCountryName(country);
        const code = getCountryCode(country);

        return (
          name === formData.country ||
          code?.toLowerCase() ===
            formData.country_code?.toLowerCase()
        );
      }) || null
    );
  }, [
    countries,
    formData.country,
    formData.country_code,
  ]);

  /**
   * Load states whenever country changes.
   */
  useEffect(() => {
    let cancelled = false;

    const loadStates = async () => {
      setStates([]);
      setCities([]);

      if (!selectedCountry) {
        return;
      }

      const countryId =
        selectedCountry?.id ??
        selectedCountry?.country_id;

      if (!countryId) {
        console.warn(
          "Selected country does not contain an id:",
          selectedCountry
        );
        return;
      }

      setLoadingStates(true);

      try {
        const result = await GetState(countryId);

        if (!cancelled) {
          setStates(Array.isArray(result) ? result : []);
        }
      } catch (error) {
        console.error("Failed to load states:", error);

        if (!cancelled) {
          toast.error("Unable to load states for this country.");
        }
      } finally {
        if (!cancelled) {
          setLoadingStates(false);
        }
      }
    };

    loadStates();

    return () => {
      cancelled = true;
    };
  }, [selectedCountry]);

  /**
   * State options.
   */
  const stateOptions = useMemo(() => {
    return states
      .map((state) => {
        const name = getStateName(state);
        const code = getStateCode(state);

        if (!name) return null;

        return {
          value: code || name,
          label: name,
          description: code ? code.toUpperCase() : "",
        };
      })
      .filter(Boolean);
  }, [states]);

  /**
   * Find selected state object.
   */
  const selectedState = useMemo(() => {
    if (!formData.state && !formData.state_code) {
      return null;
    }

    return (
      states.find((state) => {
        const name = getStateName(state);
        const code = getStateCode(state);

        return (
          name === formData.state ||
          code?.toLowerCase() ===
            formData.state_code?.toLowerCase()
        );
      }) || null
    );
  }, [
    states,
    formData.state,
    formData.state_code,
  ]);

  /**
   * Load cities whenever state changes.
   */
  useEffect(() => {
    let cancelled = false;

    const loadCities = async () => {
      setCities([]);

      if (!selectedCountry || !selectedState) {
        return;
      }

      const countryId =
        selectedCountry?.id ??
        selectedCountry?.country_id;

      const stateId =
        selectedState?.id ??
        selectedState?.state_id;

      if (!countryId || !stateId) {
        console.warn(
          "Unable to determine country/state IDs:",
          {
            selectedCountry,
            selectedState,
          }
        );
        return;
      }

      setLoadingCities(true);

      try {
        const result = await GetCity(countryId, stateId);

        if (!cancelled) {
          setCities(Array.isArray(result) ? result : []);
        }
      } catch (error) {
        console.error("Failed to load cities:", error);

        if (!cancelled) {
          toast.error("Unable to load cities for this state.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCities(false);
        }
      }
    };

    loadCities();

    return () => {
      cancelled = true;
    };
  }, [selectedCountry, selectedState]);

  /**
   * City options.
   */
  const cityOptions = useMemo(() => {
    return cities
      .map((city) => {
        const name = getCityName(city);

        if (!name) return null;

        return {
          value: name,
          label: name,
        };
      })
      .filter(Boolean);
  }, [cities]);

  /**
   * Country change.
   */
  const handleCountryChange = (value) => {
    const selected = countryOptions.find(
      (country) => country.value === value
    );

    const country = countries.find((item) => {
      const name = getCountryName(item);
      const code = getCountryCode(item);

      return (
        name === selected?.label ||
        code === value
      );
    });

    setFormData((prev) => ({
      ...prev,
      country: selected?.label || "",
      country_code:
        getCountryCode(country) || value || "",
      state: "",
      state_code: "",
      city: "",
    }));

    setAddingState(false);
    setAddingCity(false);
    setCustomState("");
    setCustomCity("");
  };

  /**
   * State change.
   */
  const handleStateChange = (value) => {
    const selected = stateOptions.find(
      (state) => state.value === value
    );

    const state = states.find((item) => {
      const name = getStateName(item);
      const code = getStateCode(item);

      return (
        name === selected?.label ||
        code === value
      );
    });

    setFormData((prev) => ({
      ...prev,
      state: selected?.label || "",
      state_code:
        getStateCode(state) || value || "",
      city: "",
    }));

    setAddingCity(false);
    setCustomCity("");
  };

  /**
   * City change.
   */
  const handleCityChange = (value) => {
    const selected = cityOptions.find(
      (city) => city.value === value
    );

    setFormData((prev) => ({
      ...prev,
      city: selected?.label || value || "",
    }));
  };

  /**
   * Add a state that isn't in the library.
   */
  const handleAddState = () => {
    const value = normalize(customState);

    if (!value) {
      toast.error("Enter your state or province.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      state: value,
      state_code: "",
      city: "",
    }));

    setCustomState("");
    setAddingState(false);
    setAddingCity(false);
    setCustomCity("");

    toast.success(`${value} added.`);
  };

  /**
   * Add a city that isn't in the library.
   */
  const handleAddCity = () => {
    const value = normalize(customCity);

    if (!value) {
      toast.error("Enter your city.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      city: value,
    }));

    setCustomCity("");
    setAddingCity(false);

    toast.success(`${value} added.`);
  };

  /**
   * Validate + save.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    const country = normalize(formData.country);
    const state = normalize(formData.state);
    const city = normalize(formData.city);

    if (!country) {
      toast.error("Please select your country.");
      return;
    }

    if (!state) {
      toast.error("Please select or add your state/province.");
      return;
    }

    if (!city) {
      toast.error("Please select or add your city.");
      return;
    }

    setSaving(true);

    try {
      await updateLocation({
        country,
        country_code:
          normalize(formData.country_code) || null,

        state,
        state_code:
          normalize(formData.state_code) || null,

        city,

        postal_code:
          normalize(formData.postal_code) || null,

        latitude: null,
        longitude: null,

        source: "manual",
      });

      toast.success("Your location has been saved.");

      onClose?.();
    } catch (error) {
      console.error("Location update error:", error);

      toast.error(
        error?.message ||
          "Unable to save your location. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;

    setAddingState(false);
    setAddingCity(false);
    setCustomState("");
    setCustomCity("");

    onClose?.();
  };

  return (
    <Modal
      isOpen={Boolean(open)}
      onClose={handleClose}
      position="center"
      size="md"
      title="Add your location"
      subtitle="Help us show you relevant community activity nearby."
      showCloseButton={!saving}
      closeOnOutsideClick={!saving}
      closeOnEscape={!saving}
      initialFocus={false}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Intro */}
        <div className="flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-primary-100">
            <MapPin className="h-5 w-5 text-primary-600" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900">
              Keep it approximate
            </p>

            <p className="mt-1 text-xs leading-5 text-ink-500">
              Your exact address isn't required. We'll use
              your country, state and city to help surface
              relevant community listings.
            </p>
          </div>
        </div>

        {/* Country */}
        <Select
          label="Country"
          required
          searchable
          options={countryOptions}
          value={
            formData.country_code ||
            countryOptions.find(
              (option) => option.label === formData.country
            )?.value ||
            ""
          }
          onChange={handleCountryChange}
          placeholder={
            loadingCountries
              ? "Loading countries..."
              : "Select your country"
          }
          disabled={
            loadingCountries ||
            saving
          }
          showIcon
        />

        {/* State */}
        <div>
          {!addingState ? (
            <>
              <Select
                label="State / Province"
                required
                searchable
                options={stateOptions}
                value={
                  stateOptions.find(
                    (option) =>
                      option.label === formData.state
                  )?.value ||
                  formData.state ||
                  ""
                }
                onChange={handleStateChange}
                placeholder={
                  !formData.country
                    ? "Select a country first"
                    : loadingStates
                    ? "Loading states..."
                    : stateOptions.length
                    ? "Select your state / province"
                    : "No states found"
                }
                disabled={
                  saving ||
                  !formData.country ||
                  loadingStates
                }
                showIcon={false}
              />

              <button
                type="button"
                onClick={() => setAddingState(true)}
                disabled={saving || !formData.country}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 transition hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                My state / province isn't listed
              </button>
            </>
          ) : (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-ink-700">
                  State / Province
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setAddingState(false);
                    setCustomState("");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-ink-400 hover:text-ink-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>

              <input
                type="text"
                value={customState}
                onChange={(event) =>
                  setCustomState(event.target.value)
                }
                placeholder="Enter your state or province"
                autoFocus={false}
                disabled={saving}
                className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 disabled:bg-ink-50"
              />

              <button
                type="button"
                onClick={handleAddState}
                disabled={saving || !normalize(customState)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Add this state / province
              </button>
            </div>
          )}
        </div>

        {/* City */}
        <div>
          {!addingCity ? (
            <>
              <Select
                label="City"
                required
                searchable
                options={cityOptions}
                value={formData.city}
                onChange={handleCityChange}
                placeholder={
                  !formData.state
                    ? "Select a state / province first"
                    : loadingCities
                    ? "Loading cities..."
                    : cityOptions.length
                    ? "Select your city"
                    : "No cities found"
                }
                disabled={
                  saving ||
                  !formData.state ||
                  loadingCities
                }
                showIcon={false}
              />

              <button
                type="button"
                onClick={() => setAddingCity(true)}
                disabled={saving || !formData.state}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 transition hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                My city isn't listed
              </button>
            </>
          ) : (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-ink-700">
                  City
                  <span className="ml-1 text-rose-500">*</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setAddingCity(false);
                    setCustomCity("");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-ink-400 hover:text-ink-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>

              <input
                type="text"
                value={customCity}
                onChange={(event) =>
                  setCustomCity(event.target.value)
                }
                placeholder="Enter your city"
                autoFocus={false}
                disabled={saving}
                className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 disabled:bg-ink-50"
              />

              <button
                type="button"
                onClick={handleAddCity}
                disabled={saving || !normalize(customCity)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Add this city
              </button>
            </div>
          )}
        </div>

        {/* Postal code */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink-700">
            Postal code
            <span className="ml-1 text-xs font-normal text-ink-400">
              (optional)
            </span>
          </label>

          <input
            type="text"
            value={formData.postal_code}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                postal_code: event.target.value,
              }))
            }
            placeholder="Enter postal code"
            disabled={saving}
            autoFocus={false}
            className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 disabled:bg-ink-50"
          />
        </div>

        {/* Privacy */}
        <div className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-3.5">
          <ShieldCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600" />

          <p className="text-xs leading-5 text-ink-500">
            Only your approximate location is used for
            community matching. Your exact address is not
            required.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              saving ||
              !formData.country ||
              !formData.state ||
              !formData.city
            }
            className="inline-flex min-w-[130px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Save location
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default LocationModal;