import { useEffect, useState } from 'react';

const defaultCatalogPreferences = {
	selectedFormat: 'all',
	searchQuery: '',
	sortOption: 'date-asc',
	resultsDensity: 'compact',
};

function loadCatalogPreferences() {
	if (typeof window === 'undefined') {
		return defaultCatalogPreferences;
	}

	try {
		const storedPreferences = window.localStorage.getItem('catalogPreferences');

		if (!storedPreferences) {
			return defaultCatalogPreferences;
		}

		const { formatFilter, ...savedPreferences } = JSON.parse(storedPreferences);

		return {
			...defaultCatalogPreferences,
			...savedPreferences,
			selectedFormat:
				savedPreferences.selectedFormat ??
				formatFilter ??
				defaultCatalogPreferences.selectedFormat,
		};
	} catch {
		return defaultCatalogPreferences;
	}
}

export default function useCatalogPreferences() {
	const [catalogPreferences, setCatalogPreferences] =
		useState(loadCatalogPreferences);

	useEffect(() => {
		window.localStorage.setItem(
			'catalogPreferences',
			JSON.stringify(catalogPreferences),
		);
	}, [catalogPreferences]);

	const updateCatalogPreference = (key, value) => {
		setCatalogPreferences((currentPreferences) => ({
			...currentPreferences,
			[key]: value,
		}));
	};

	const resetCatalogPreferences = () => {
		setCatalogPreferences((currentPreferences) => ({
			...currentPreferences,
			selectedFormat: defaultCatalogPreferences.selectedFormat,
			searchQuery: defaultCatalogPreferences.searchQuery,
			sortOption: defaultCatalogPreferences.sortOption,
		}));
	};

	return {
		catalogPreferences,
		updateCatalogPreference,
		resetCatalogPreferences,
	};
}
