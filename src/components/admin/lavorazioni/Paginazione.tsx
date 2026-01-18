import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginazioneProps {
  paginaCorrente: number;
  totalePagine: number;
  onPaginaChange: (pagina: number) => void;
}

export function Paginazione({
  paginaCorrente,
  totalePagine,
  onPaginaChange,
}: PaginazioneProps) {
  if (totalePagine <= 1) return null;

  const getPagineVisibili = () => {
    const pagine: (number | string)[] = [];
    const delta = 2; // Pagine da mostrare prima e dopo quella corrente

    for (let i = 1; i <= totalePagine; i++) {
      if (
        i === 1 ||
        i === totalePagine ||
        (i >= paginaCorrente - delta && i <= paginaCorrente + delta)
      ) {
        pagine.push(i);
      } else if (pagine[pagine.length - 1] !== '...') {
        pagine.push('...');
      }
    }

    return pagine;
  };

  const pagineVisibili = getPagineVisibili();

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPaginaChange(paginaCorrente - 1)}
          disabled={paginaCorrente === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Precedente
        </button>
        <button
          onClick={() => onPaginaChange(paginaCorrente + 1)}
          disabled={paginaCorrente === totalePagine}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Successiva
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-center">
        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
          <button
            onClick={() => onPaginaChange(paginaCorrente - 1)}
            disabled={paginaCorrente === 1}
            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
          >
            <span className="sr-only">Previous</span>
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          {pagineVisibili.map((pagina, idx) => {
            if (pagina === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={pagina}
                onClick={() => onPaginaChange(Number(pagina))}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                  pagina === paginaCorrente
                    ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                }`}
              >
                {pagina}
              </button>
            );
          })}

          <button
            onClick={() => onPaginaChange(paginaCorrente + 1)}
            disabled={paginaCorrente === totalePagine}
            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
          >
            <span className="sr-only">Next</span>
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
}
