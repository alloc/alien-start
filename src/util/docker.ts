export async function getLatestImageVersion(image: string, suffix?: string) {
  const imageURI = image.includes('/') ? image : 'library/' + image
  const response = await fetch(
    `https://hub.docker.com/v2/repositories/${imageURI}/tags?page_size=20`
  )
  const data = (await response.json()) as {
    results: { name: string }[]
  }
  const latest = data.results
    .map(result => result.name)
    .find(name => {
      if (suffix) {
        if (!name.endsWith(suffix)) {
          return false
        }
        name = name.slice(0, -suffix.length)
      }
      return name.match(/^v?\d+(\.\d+(\.\d+)?)?$/)
    })
  if (!latest) {
    console.log(data.results.map(result => result.name))
    throw Error(`Could not find latest version for ${image}`)
  }
  return image + ':' + latest
}
