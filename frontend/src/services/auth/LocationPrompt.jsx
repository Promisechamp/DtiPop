import React from 'react';
import {
  MapPin,
  ArrowRight,
  X,
} from 'lucide-react';

const LocationPrompt = ({
  onAddLocation,
  onDismiss,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50" style={{ boxShadow: "0 0 10px #0002"}}>
      <div className="flex items-start gap-4 p-4 sm:p-5">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Find your community
              </h3>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Add your city and state to see
                borrowing opportunities and
                community activity near you.
              </p>
            </div>

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss location prompt"
                className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Privacy reassurance */}
          <p className="mt-3 text-xs text-gray-400">
            Your exact address isn't required or
            shown to other members.
          </p>

          {/* Action */}
          <button
            type="button"
            onClick={onAddLocation}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:opacity-80"
          >
            Add location

            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPrompt;